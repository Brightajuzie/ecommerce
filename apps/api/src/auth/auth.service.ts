import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { UserRole, VendorStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtPayload } from "./types/authenticated-user.type";

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const role = dto.role ?? UserRole.BUYER;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role,
        cart: { create: {} },
        ...(role === UserRole.VENDOR
          ? {
              vendorProfile: {
                create: {
                  businessName: dto.businessName as string,
                  status: VendorStatus.PENDING,
                },
              },
            }
          : {}),
      },
    });

    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
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

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    return this.issueTokens(user.id, user.email, user.role);
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

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

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
        createdAt: user.createdAt,
      },
    };
  }
}
