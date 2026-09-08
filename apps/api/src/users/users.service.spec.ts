import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { UsersService } from "./users.service";
import type { PrismaService } from "../prisma/prisma.service";

interface MockPrisma {
  user: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  $transaction: jest.Mock;
}

describe("UsersService admin role management", () => {
  let service: UsersService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    service = new UsersService(prisma as unknown as PrismaService);
  });

  describe("createForAdmin", () => {
    it("lets a regular ADMIN create a BUYER/VENDOR/EDITOR account", async () => {
      prisma.user.findUnique.mockResolvedValue(null); // no existing email
      prisma.user.create.mockResolvedValue({ id: "u1", role: UserRole.EDITOR });

      await expect(
        service.createForAdmin(UserRole.ADMIN, {
          email: "e@test.com",
          password: "password123",
          firstName: "A",
          lastName: "B",
          role: UserRole.EDITOR,
        } as any),
      ).resolves.toBeDefined();
    });

    it("refuses a regular ADMIN creating an ADMIN account", async () => {
      await expect(
        service.createForAdmin(UserRole.ADMIN, {
          email: "e@test.com",
          password: "password123",
          firstName: "A",
          lastName: "B",
          role: UserRole.ADMIN,
        } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("refuses a regular ADMIN creating a SUPER_ADMIN account", async () => {
      await expect(
        service.createForAdmin(UserRole.ADMIN, {
          email: "e@test.com",
          password: "password123",
          firstName: "A",
          lastName: "B",
          role: UserRole.SUPER_ADMIN,
        } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("lets a SUPER_ADMIN create an ADMIN account", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: "u1", role: UserRole.ADMIN });

      await expect(
        service.createForAdmin(UserRole.SUPER_ADMIN, {
          email: "e@test.com",
          password: "password123",
          firstName: "A",
          lastName: "B",
          role: UserRole.ADMIN,
        } as any),
      ).resolves.toBeDefined();
    });

    it("still rejects a duplicate email", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "existing" });

      await expect(
        service.createForAdmin(UserRole.SUPER_ADMIN, {
          email: "dupe@test.com",
          password: "password123",
          firstName: "A",
          lastName: "B",
          role: UserRole.BUYER,
        } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("updateForAdmin", () => {
    it("hides an ADMIN target account from a regular ADMIN caller (404, not 403)", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "target-1",
        role: UserRole.ADMIN,
        email: "admin@test.com",
        vendorProfile: null,
      });

      await expect(
        service.updateForAdmin(UserRole.ADMIN, "caller-1", "target-1", {
          firstName: "New",
        } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("refuses a regular ADMIN promoting a buyer to ADMIN", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "target-1",
        role: UserRole.BUYER,
        email: "buyer@test.com",
        vendorProfile: null,
      });

      await expect(
        service.updateForAdmin(UserRole.ADMIN, "caller-1", "target-1", {
          role: UserRole.ADMIN,
        } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("lets a SUPER_ADMIN promote a buyer to EDITOR", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "target-1",
        role: UserRole.BUYER,
        email: "buyer@test.com",
        vendorProfile: null,
      });
      prisma.user.update.mockResolvedValue({ id: "target-1", role: UserRole.EDITOR });

      await expect(
        service.updateForAdmin(UserRole.SUPER_ADMIN, "caller-1", "target-1", {
          role: UserRole.EDITOR,
        } as any),
      ).resolves.toBeDefined();
    });

    it("blocks a caller from changing their own role, even to one they could otherwise assign", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "caller-1",
        role: UserRole.SUPER_ADMIN,
        email: "me@test.com",
        vendorProfile: null,
      });

      await expect(
        service.updateForAdmin(UserRole.SUPER_ADMIN, "caller-1", "caller-1", {
          role: UserRole.ADMIN,
        } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("blocks switching an existing vendor to any other role (not just BUYER)", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "target-1",
        role: UserRole.VENDOR,
        email: "vendor@test.com",
        vendorProfile: { id: "vp1" },
      });

      await expect(
        service.updateForAdmin(UserRole.SUPER_ADMIN, "caller-1", "target-1", {
          role: UserRole.EDITOR,
        } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("listForAdmin", () => {
    it("returns an empty page rather than querying when a regular ADMIN filters by role=ADMIN", async () => {
      const result = await service.listForAdmin(UserRole.ADMIN, {
        role: UserRole.ADMIN,
      } as any);

      expect(result).toEqual({ data: [], page: 1, pageSize: 20, total: 0 });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("lets a SUPER_ADMIN filter by role=ADMIN", async () => {
      prisma.$transaction.mockResolvedValue([[{ id: "a1" }], 1]);

      const result = await service.listForAdmin(UserRole.SUPER_ADMIN, {
        role: UserRole.ADMIN,
      } as any);

      expect(result.total).toBe(1);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
