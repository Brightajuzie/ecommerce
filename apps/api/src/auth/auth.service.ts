import { randomBytes } from "node:crypto";
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { UserRole, VendorStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import axios from "axios";
import { PrismaService } from "../prisma/prisma.service";
import { generateReferralCode } from "../users/referral-code.util";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { GuestCheckoutDto } from "./dto/guest-checkout.dto";
import { JwtPayload } from "./types/authenticated-user.type";

const REFERRAL_CODE_MAX_ATTEMPTS = 5;

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const role = dto.role ?? UserRole.BUYER;
    const referralCode = await this.generateUniqueReferralCode();

    // A bad/unknown code is ignored rather than rejected — don't block a
    // signup over a typo'd or copy-pasted-wrong referral code.
    const referrer = dto.referralCode
      ? await this.prisma.user.findUnique({
          where: { referralCode: dto.referralCode.toUpperCase() },
        })
      : null;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role,
        referralCode,
        referredById: referrer?.id,
        cart: { create: {} },
        // Auto-approved — no admin review gate before a new vendor can start
        // listing products. Admins retain a real check afterward: any vendor
        // can be suspended regardless of status (see VendorsService.suspend/
        // listAll), so this trades a pre-listing checkpoint for zero signup
        // friction rather than removing oversight entirely.
        ...(role === UserRole.VENDOR
          ? {
              vendorProfile: {
                create: {
                  businessName: dto.businessName as string,
                  status: VendorStatus.APPROVED,
                },
              },
            }
          : {}),
      },
    });

    return this.issueTokens(user.id, user.email, user.role);
  }

  /**
   * Lets a buyer complete a purchase without registering first — creates a
   * real account (so the rest of the app, order history, wallet, referrals,
   * needs no separate "guest order" code path) with a random, never-
   * revealed password hash. hasPassword: false marks it as not actually
   * loggable-into yet; the buyer sets a real one afterward via
   * setPassword(), typically prompted right on their order receipt once
   * payment succeeds (see OrderDetailScreen).
   *
   * An email that's already registered is refused rather than silently
   * reused — this must never become a way to check out into someone
   * else's existing account.
   */
  async guestCheckout(dto: GuestCheckoutDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(
        "An account with this email already exists — please sign in instead.",
      );
    }

    const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), SALT_ROUNDS);
    const referralCode = await this.generateUniqueReferralCode();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        hasPassword: false,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: UserRole.BUYER,
        referralCode,
        cart: { create: {} },
        addresses: {
          create: {
            label: dto.address.label || "Home",
            line1: dto.address.line1,
            line2: dto.address.line2,
            city: dto.address.city,
            state: dto.address.state,
            country: dto.address.country || undefined,
            phone: dto.address.phone,
            isDefault: true,
          },
        },
      },
    });

    return this.issueTokens(user.id, user.email, user.role);
  }

  /** Claims a guest-checkout account with a real password — see guestCheckout(). */
  async setPassword(userId: string, password: string) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, hasPassword: true },
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // OAuth-only accounts have no password hash — direct them to Google sign-in.
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        "This account uses Google sign-in. Please use the 'Continue with Google' option.",
      );
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  /**
   * Verifies a Google ID token, then finds or creates a user for the matching
   * Google account:
   *   • existing googleId  → issue tokens immediately
   *   • matching email     → link the googleId to their account, issue tokens
   *   • no match           → create a new BUYER account (no password), issue tokens
   *
   * Verification uses Google's tokeninfo endpoint (no extra packages needed —
   * axios is already a project dependency). The `aud` claim is checked against
   * GOOGLE_CLIENT_ID so tokens minted for other apps are rejected.
   */
  async googleLogin(idToken: string) {
    // Verify token with Google and extract claims.
    interface GoogleTokenInfo {
      sub: string;
      email: string;
      email_verified: string;
      given_name?: string;
      family_name?: string;
      aud: string;
    }

    let tokenInfo: GoogleTokenInfo;
    try {
      const { data } = await axios.get<GoogleTokenInfo>(
        "https://oauth2.googleapis.com/tokeninfo",
        { params: { id_token: idToken } },
      );
      tokenInfo = data;
    } catch {
      throw new UnauthorizedException("Invalid Google token");
    }

    if (tokenInfo.email_verified !== "true") {
      throw new UnauthorizedException("Google account email is not verified");
    }

    // The token's `aud` claim is whichever OAuth client actually requested
    // it — the mobile app hands expo-auth-session all three (web/Android/
    // iOS) client IDs at once (see GoogleSignInButton.tsx) and it picks the
    // one for the current platform, so a token minted from the Android app
    // legitimately carries the Android client ID as `aud`, never the web
    // one. Checking against only googleClientId (web) would reject every
    // real native sign-in outright — valid if it matches ANY configured
    // platform's client ID.
    const paymentSettings = await this.prisma.platformPaymentSettings.findFirst({
      select: { googleClientId: true, googleAndroidClientId: true, googleIosClientId: true },
    });
    const expectedAudiences = [
      paymentSettings?.googleClientId || this.configService.get<string>("GOOGLE_CLIENT_ID"),
      paymentSettings?.googleAndroidClientId ||
        this.configService.get<string>("GOOGLE_ANDROID_CLIENT_ID"),
      paymentSettings?.googleIosClientId || this.configService.get<string>("GOOGLE_IOS_CLIENT_ID"),
    ].filter((aud): aud is string => Boolean(aud));
    if (expectedAudiences.length > 0 && !expectedAudiences.includes(tokenInfo.aud)) {
      throw new UnauthorizedException("Google token audience mismatch");
    }

    const { sub: googleId, email, given_name, family_name } = tokenInfo;

    // 1. Existing user linked to this Google account — fast path.
    const byGoogleId = await this.prisma.user.findUnique({
      where: { googleId },
    });
    if (byGoogleId) {
      if (!byGoogleId.isActive) throw new UnauthorizedException("Account is deactivated");
      return this.issueTokens(byGoogleId.id, byGoogleId.email, byGoogleId.role);
    }

    // 2. Email already registered — link the Google account.
    const byEmail = await this.prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      if (!byEmail.isActive) throw new UnauthorizedException("Account is deactivated");
      const updated = await this.prisma.user.update({
        where: { id: byEmail.id },
        data: { googleId },
      });
      return this.issueTokens(updated.id, updated.email, updated.role);
    }

    // 3. Brand-new user — create with no password hash.
    const referralCode = await this.generateUniqueReferralCode();
    const newUser = await this.prisma.user.create({
      data: {
        email,
        googleId,
        firstName: given_name ?? email.split("@")[0],
        lastName: family_name ?? "",
        hasPassword: false,
        role: UserRole.BUYER,
        referralCode,
        cart: { create: {} },
      },
    });

    return this.issueTokens(newUser.id, newUser.email, newUser.role);
  }

  private async generateUniqueReferralCode(): Promise<string> {
    for (let attempt = 0; attempt < REFERRAL_CODE_MAX_ATTEMPTS; attempt++) {
      const code = generateReferralCode();
      const existing = await this.prisma.user.findUnique({
        where: { referralCode: code },
      });
      if (!existing) {
        return code;
      }
    }
    // Astronomically unlikely with a 32^7 code space — fall back to a
    // guaranteed-unique value rather than fail registration outright.
    return `${generateReferralCode()}${Date.now().toString(36).toUpperCase()}`;
  }

  private async issueTokens(userId: string, email: string, role: UserRole) {
    const payload: JwtPayload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>("JWT_SECRET"),
        expiresIn: this.configService.get<string>(
          "JWT_ACCESS_EXPIRES_IN",
          "15m",
        ) as JwtSignOptions["expiresIn"],
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: this.configService.get<string>(
          "JWT_REFRESH_EXPIRES_IN",
          "7d",
        ) as JwtSignOptions["expiresIn"],
      }),
    ]);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        hasPassword: user.hasPassword,
        createdAt: user.createdAt,
      },
    };
  }
}
