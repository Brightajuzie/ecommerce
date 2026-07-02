import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { UserRole, VendorStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue("signed-token"),
      verifyAsync: jest.fn(),
    };
    configService = {
      getOrThrow: jest.fn((key: string) => `${key}-value`),
      get: jest.fn((_key: string, fallback: string) => fallback),
    };

    service = new AuthService(prisma, jwtService, configService);
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
        } as any),
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
      } as any);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vendorProfile: {
              create: expect.objectContaining({
                businessName: "Vendor Biz",
                status: VendorStatus.PENDING,
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
        service.login({ email: "user@example.com", password: "wrong-password" }),
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
});
