import { ConflictException, UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { JwtService } from "@nestjs/jwt";
import { UserRole, VendorStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import axios from "axios";
import { AuthService } from "./auth.service";
import type { PrismaService } from "../prisma/prisma.service";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

interface MockPrisma {
  user: {
    findUnique: jest.Mock;
    findUniqueOrThrow: jest.Mock;
    create: jest.Mock;
  };
  platformPaymentSettings: {
    findFirst: jest.Mock;
  };
}

describe("AuthService", () => {
  let service: AuthService;
  let prisma: MockPrisma;
  let jwtService: Pick<JwtService, "signAsync" | "verifyAsync">;
  let configService: Pick<ConfigService, "get" | "getOrThrow">;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
      },
      platformPaymentSettings: {
        findFirst: jest.fn().mockResolvedValue({
          googleClientId: "web-client-id",
          googleAndroidClientId: "android-client-id",
          googleIosClientId: null,
        }),
      },
    };
    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValue("signed-token") as JwtService["signAsync"],
      verifyAsync: jest.fn() as JwtService["verifyAsync"],
    };
    configService = {
      getOrThrow: jest.fn(
        (key: string) => `${key}-value`,
      ) as ConfigService["getOrThrow"],
      get: jest.fn(
        (_key: string, fallback: string) => fallback,
      ) as ConfigService["get"],
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as JwtService,
      configService as ConfigService,
    );
  });

  describe("register", () => {
    it("throws a ConflictException when the email is already registered", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "existing-user" });

      await expect(
        service.register({
          email: "taken@example.com",
          password: "password123",
          firstName: "A",
          lastName: "B",
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("creates a vendor profile when registering with role VENDOR", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: "new-user",
        email: "vendor@example.com",
        role: UserRole.VENDOR,
      });
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: "new-user",
        email: "vendor@example.com",
        role: UserRole.VENDOR,
        phone: null,
        firstName: "V",
        lastName: "Endor",
        createdAt: new Date(),
      });

      await service.register({
        email: "vendor@example.com",
        password: "password123",
        firstName: "V",
        lastName: "Endor",
        role: UserRole.VENDOR,
        businessName: "Vendor Biz",
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vendorProfile: {
              create: expect.objectContaining({
                businessName: "Vendor Biz",
                status: VendorStatus.APPROVED,
              }),
            },
          }),
        }),
      );
    });
  });

  describe("login", () => {
    it("throws UnauthorizedException for an unknown email", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: "nobody@example.com", password: "x" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("throws UnauthorizedException for a wrong password", async () => {
      const passwordHash = await bcrypt.hash("correct-password", 10);
      prisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        isActive: true,
        passwordHash,
      });

      await expect(
        service.login({
          email: "user@example.com",
          password: "wrong-password",
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("issues tokens for correct credentials", async () => {
      const passwordHash = await bcrypt.hash("correct-password", 10);
      prisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        isActive: true,
        passwordHash,
        role: UserRole.BUYER,
      });
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        phone: null,
        firstName: "U",
        lastName: "Ser",
        role: UserRole.BUYER,
        createdAt: new Date(),
      });

      const result = await service.login({
        email: "user@example.com",
        password: "correct-password",
      });

      expect(result.accessToken).toBe("signed-token");
      expect(result.refreshToken).toBe("signed-token");
      expect(result.user.email).toBe("user@example.com");
    });
  });

  describe("googleLogin", () => {
    // The mobile app hands expo-auth-session all three (web/Android/iOS)
    // client IDs at once and it picks the one for the current platform, so
    // a token minted from the Android app legitimately carries the Android
    // client ID as `aud`, never the web one — this is the exact case that
    // was rejected before the fix (only googleClientId, the web one, was
    // ever checked).
    it("accepts a token whose aud matches the Android client ID, not just the web one", async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          sub: "google-sub-1",
          email: "android-user@example.com",
          email_verified: "true",
          given_name: "Android",
          family_name: "User",
          aud: "android-client-id",
        },
      });
      prisma.user.findUnique
        .mockResolvedValueOnce(null) // no user with this googleId yet
        .mockResolvedValueOnce(null); // no user with this email yet
      prisma.user.create.mockResolvedValue({ id: "new-user" });
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: "new-user",
        email: "android-user@example.com",
        phone: null,
        firstName: "Android",
        lastName: "User",
        role: UserRole.BUYER,
        createdAt: new Date(),
      });

      const result = await service.googleLogin("some-id-token");

      expect(result.user.email).toBe("android-user@example.com");
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it("rejects a token whose aud matches none of the configured client IDs", async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          sub: "google-sub-2",
          email: "someone@example.com",
          email_verified: "true",
          aud: "some-other-apps-client-id",
        },
      });

      await expect(service.googleLogin("some-id-token")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
