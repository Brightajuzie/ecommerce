import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, UserRole, VendorStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { AddressDto } from "./dto/address.dto";
import { AdminListUsersQueryDto } from "./dto/admin-list-users-query.dto";
import { AdminCreateUserDto } from "./dto/admin-create-user.dto";
import { AdminUpdateUserDto } from "./dto/admin-update-user.dto";
import { generateReferralCode } from "./referral-code.util";

const REFERRAL_CODE_MAX_ATTEMPTS = 5;

const SALT_ROUNDS = 10;
const ADMIN_MANAGED_ROLES = [UserRole.BUYER, UserRole.VENDOR] as const;
const ADMIN_USER_SELECT = {
  id: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  createdAt: true,
  vendorProfile: { select: { id: true, businessName: true, status: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        vendorProfile: true,
        referralCode: true,
        _count: { select: { referrals: true } },
      },
    });
    const { _count, ...rest } = user;
    return { ...rest, referralCount: _count.referrals };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
  }

  async listAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createAddress(userId: string, dto: AddressDto) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.create({ data: { ...dto, userId } });
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: Partial<AddressDto>,
  ) {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });
    if (!address || address.userId !== userId) {
      throw new NotFoundException("Address not found");
    }

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({ where: { id: addressId }, data: dto });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });
    if (!address || address.userId !== userId) {
      throw new NotFoundException("Address not found");
    }
    await this.prisma.address.delete({ where: { id: addressId } });
    return { success: true };
  }

  // Admin-facing user management is scoped to BUYER/VENDOR accounts only —
  // ADMIN/SUPER_ADMIN accounts never appear in this list and can't be
  // created or edited through it, so there's no path here to privilege
  // escalation or an admin editing a peer/superior's account.
  async listForAdmin(query: AdminListUsersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.UserWhereInput = {
      role: query.role ? query.role : { in: [...ADMIN_MANAGED_ROLES] },
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: "insensitive" } },
              { firstName: { contains: query.search, mode: "insensitive" } },
              { lastName: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: ADMIN_USER_SELECT,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, page, pageSize, total };
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
    return `${generateReferralCode()}${Date.now().toString(36).toUpperCase()}`;
  }

  async findOneForAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: ADMIN_USER_SELECT,
    });
    if (!user || !ADMIN_MANAGED_ROLES.includes(user.role as (typeof ADMIN_MANAGED_ROLES)[number])) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async createForAdmin(dto: AdminCreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const role = dto.role ?? UserRole.BUYER;
    const referralCode = await this.generateUniqueReferralCode();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role,
        referralCode,
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
      select: ADMIN_USER_SELECT,
    });

    return user;
  }

  async updateForAdmin(userId: string, dto: AdminUpdateUserDto) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { vendorProfile: true },
    });
    if (!target || !ADMIN_MANAGED_ROLES.includes(target.role as (typeof ADMIN_MANAGED_ROLES)[number])) {
      throw new NotFoundException("User not found");
    }

    if (dto.email && dto.email !== target.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException("An account with this email already exists");
      }
    }

    if (dto.role === UserRole.VENDOR && target.role !== UserRole.VENDOR) {
      if (!target.vendorProfile && !dto.businessName) {
        throw new BadRequestException(
          "businessName is required to switch this account to a vendor",
        );
      }
    }
    if (dto.role === UserRole.BUYER && target.role === UserRole.VENDOR) {
      throw new ForbiddenException(
        "Switching an existing vendor back to a buyer isn't supported here — it would orphan their products and orders",
      );
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        isActive: dto.isActive,
        role: dto.role,
        ...(dto.role === UserRole.VENDOR && !target.vendorProfile
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
      select: ADMIN_USER_SELECT,
    });
  }
}
