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

// Who can see/create/edit an account of a given role, through the admin
// user-management endpoints below. SUPER_ADMIN can manage every role,
// including other ADMIN/SUPER_ADMIN accounts. A regular ADMIN's reach is
// deliberately narrower than that — BUYER/VENDOR (as before) plus EDITOR
// (a lower-privilege role than ADMIN itself) — but never ADMIN or
// SUPER_ADMIN, so there's no path for an ADMIN to touch a peer or
// superior's account, let alone escalate their own.
function manageableRolesFor(callerRole: UserRole): readonly UserRole[] {
  if (callerRole === UserRole.SUPER_ADMIN) {
    return [
      UserRole.BUYER,
      UserRole.VENDOR,
      UserRole.EDITOR,
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
    ] as const;
  }
  return [UserRole.BUYER, UserRole.VENDOR, UserRole.EDITOR] as const;
}

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
        identityVerified: true,
        livenessVerified: true,
        hasPassword: true,
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

  // Scoped to whichever roles the caller can manage (see
  // manageableRolesFor) — a regular ADMIN never sees another ADMIN or
  // SUPER_ADMIN account here, so there's no path to an admin editing a
  // peer/superior's account, let alone escalating their own.
  async listForAdmin(callerRole: UserRole, query: AdminListUsersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const manageableRoles = manageableRolesFor(callerRole);

    // A role filter outside what this caller can manage isn't an error —
    // it just can't match anything, same as filtering by a role that
    // simply has no accounts. Short-circuits before hitting the DB rather
    // than passing an empty `in: []` (which Prisma would also just match
    // nothing on, but this is clearer about why).
    if (query.role && !manageableRoles.includes(query.role)) {
      return { data: [], page, pageSize, total: 0 };
    }

    const where: Prisma.UserWhereInput = {
      role: query.role ? query.role : { in: [...manageableRoles] },
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

  async findOneForAdmin(callerRole: UserRole, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: ADMIN_USER_SELECT,
    });
    if (!user || !manageableRolesFor(callerRole).includes(user.role)) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async createForAdmin(callerRole: UserRole, dto: AdminCreateUserDto) {
    const role = dto.role ?? UserRole.BUYER;
    if (!manageableRolesFor(callerRole).includes(role)) {
      throw new ForbiddenException(
        "You don't have permission to create an account with this role",
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
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
                  // Same auto-approve policy as self-serve signup (see
                  // AuthService.register) — an admin creating/upgrading the
                  // account directly already is the approval step.
                  status: VendorStatus.APPROVED,
                },
              },
            }
          : {}),
      },
      select: ADMIN_USER_SELECT,
    });

    return user;
  }

  async updateForAdmin(
    callerRole: UserRole,
    callerId: string,
    userId: string,
    dto: AdminUpdateUserDto,
  ) {
    const manageableRoles = manageableRolesFor(callerRole);
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { vendorProfile: true },
    });
    if (!target || !manageableRoles.includes(target.role)) {
      throw new NotFoundException("User not found");
    }

    if (dto.role && !manageableRoles.includes(dto.role)) {
      throw new ForbiddenException(
        "You don't have permission to assign this role",
      );
    }
    // A guard against accidental self-lockout, not privilege escalation
    // (manageableRoles already blocks that) — e.g. a SUPER_ADMIN demoting
    // themselves to BUYER mid-edit and losing access to undo it.
    if (userId === callerId && dto.role && dto.role !== target.role) {
      throw new ForbiddenException("You can't change your own role");
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
    // Blocks switching AWAY from vendor to any other role, not just to
    // BUYER — a vendor with products/orders on their profile would be
    // orphaned by a role change to EDITOR/ADMIN just as much as to BUYER.
    if (target.role === UserRole.VENDOR && dto.role && dto.role !== UserRole.VENDOR) {
      throw new ForbiddenException(
        "Switching an existing vendor to another role isn't supported here — it would orphan their products and orders",
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
                  // Same auto-approve policy as self-serve signup (see
                  // AuthService.register) — an admin creating/upgrading the
                  // account directly already is the approval step.
                  status: VendorStatus.APPROVED,
                },
              },
            }
          : {}),
      },
      select: ADMIN_USER_SELECT,
    });
  }
}
