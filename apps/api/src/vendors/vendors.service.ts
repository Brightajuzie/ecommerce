import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRole, VendorStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { FlutterwaveService } from "../payments/flutterwave/flutterwave.service";
import type { PayoutAccount } from "../payment-settings/payment-settings.service";
import { ApplyVendorDto } from "./dto/apply-vendor.dto";
import { SetPayoutAccountDto } from "./dto/set-payout-account.dto";
import { SetVendorDocumentsDto } from "./dto/set-vendor-documents.dto";
import { UpdateVendorDto } from "./dto/update-vendor.dto";

// Flattens the joined `user.identityVerified`/`livenessVerified` onto the
// VendorProfile shape so the mobile client doesn't need a separate nested
// lookup — used wherever admin reviews an application (identity + liveness
// + documents together) or a vendor checks their own review status.
function withIdentityVerified<
  T extends { user: { identityVerified: boolean; livenessVerified: boolean } },
>(vendor: T) {
  const { user, ...rest } = vendor;
  return { ...rest, identityVerified: user.identityVerified, livenessVerified: user.livenessVerified };
}

@Injectable()
export class VendorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flutterwaveService: FlutterwaveService,
  ) {}

  // Auto-approved on application — no admin review gate before a vendor can
  // start listing products (identity/liveness verification stay separately
  // optional too, see DojahService/KycService). Admins retain a real check:
  // suspend() works on any vendor regardless of status, and listAll() below
  // powers an admin screen to find and suspend a vendor after the fact.
  async apply(userId: string, dto: ApplyVendorDto) {
    const existing = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException(
        "A vendor profile already exists for this account",
      );
    }

    return this.prisma.vendorProfile.create({
      data: { ...dto, userId, status: VendorStatus.APPROVED },
    });
  }

  async listApproved() {
    return this.prisma.vendorProfile.findMany({
      where: { status: VendorStatus.APPROVED },
      select: {
        id: true,
        businessName: true,
        description: true,
        logoUrl: true,
        status: true,
      },
    });
  }

  async listPending() {
    const vendors = await this.prisma.vendorProfile.findMany({
      where: { status: VendorStatus.PENDING },
      include: { user: { select: { identityVerified: true, livenessVerified: true } } },
    });
    return vendors.map(withIdentityVerified);
  }

  // Every vendor regardless of status, PENDING first (near-empty in
  // practice now that apply() auto-approves, but still surfaced in case a
  // status ever gets reverted) then APPROVED then SUSPENDED — powers the
  // admin "Vendors" screen's ability to find and suspend/reactivate a
  // vendor after the fact, since apply() no longer requires review first.
  async listAll() {
    const statusOrder: Record<VendorStatus, number> = {
      [VendorStatus.PENDING]: 0,
      [VendorStatus.APPROVED]: 1,
      [VendorStatus.SUSPENDED]: 2,
    };
    const vendors = await this.prisma.vendorProfile.findMany({
      include: { user: { select: { identityVerified: true, livenessVerified: true } } },
      orderBy: { createdAt: "desc" },
    });
    return vendors
      .map(withIdentityVerified)
      .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }

  async setStatus(vendorId: string, status: VendorStatus) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
    });
    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }
    return this.prisma.vendorProfile.update({
      where: { id: vendorId },
      data: { status },
    });
  }

  // Admin-only edit of a vendor's own listed details — name, description,
  // commission rate. Distinct from apply()/setDocuments(), which the vendor
  // submits about themselves; identity/liveness/document review stay on
  // their own flows, not folded into this generic edit.
  async updateVendor(vendorId: string, dto: UpdateVendorDto) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
    });
    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }
    return this.prisma.vendorProfile.update({
      where: { id: vendorId },
      data: {
        ...(dto.businessName !== undefined && { businessName: dto.businessName }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.commissionRate !== undefined && { commissionRate: dto.commissionRate }),
      },
    });
  }

  /**
   * Permanently removes a vendor's store — only when it's safe to: refuses
   * if the vendor has ever had a VendorOrder (which would mean OrderItems
   * pointing at their Products, since OrderItem/Product have no cascade —
   * this check is what guarantees the cascade below can't fail on that FK),
   * a withdrawal request, or a nonzero wallet balance, since any of those
   * represent real financial/audit history that a hard delete shouldn't be
   * able to silently erase. suspend() is the right tool for an active
   * vendor with history; delete is for a mistaken/spam signup with none.
   *
   * The underlying User account isn't deleted — it's reverted to BUYER, so
   * a vendor with no history simply loses selling access instead of losing
   * their login, and the app doesn't end up routing them into a
   * VendorNavigator with no VendorProfile behind it (see RootNavigator's
   * role-based routing).
   */
  async deleteVendor(vendorId: string) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      include: { wallet: true },
    });
    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }

    const [orderCount, withdrawalCount] = await Promise.all([
      this.prisma.vendorOrder.count({ where: { vendorId } }),
      this.prisma.withdrawalRequest.count({ where: { vendorId } }),
    ]);
    if (orderCount > 0 || withdrawalCount > 0) {
      throw new ConflictException(
        "This vendor has order or payout history and can't be deleted — suspend them instead.",
      );
    }
    if (vendor.wallet && Number(vendor.wallet.balance) > 0) {
      throw new ConflictException(
        "This vendor's wallet still has a balance — resolve it before deleting.",
      );
    }

    await this.prisma.$transaction([
      // Cascades to their Products (and Wallet, if the zero-balance one
      // above exists) per the schema's onDelete: Cascade on those relations.
      this.prisma.vendorProfile.delete({ where: { id: vendorId } }),
      this.prisma.user.update({
        where: { id: vendor.userId },
        data: { role: UserRole.BUYER },
      }),
    ]);
  }

  async getMyVendorProfile(userId: string) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { userId },
      include: { user: { select: { identityVerified: true, livenessVerified: true } } },
    });
    if (!vendor) {
      throw new NotFoundException("No vendor profile found for this account");
    }
    return withIdentityVerified(vendor);
  }

  /**
   * Saves the vendor's application-review documents (business registration,
   * government ID) — replaces the old selfie-based Biometric KYC submission.
   * Each field is independently optional so a vendor can upload and save
   * one document at a time.
   */
  async setDocuments(userId: string, dto: SetVendorDocumentsDto) {
    const vendor = await this.getMyVendorProfile(userId);
    return this.prisma.vendorProfile.update({
      where: { id: vendor.id },
      data: {
        ...(dto.businessRegistrationDocUrl !== undefined && {
          businessRegistrationDocUrl: dto.businessRegistrationDocUrl,
        }),
        ...(dto.governmentIdDocUrl !== undefined && {
          governmentIdDocUrl: dto.governmentIdDocUrl,
        }),
      },
    });
  }

  async setPayoutAccount(userId: string, dto: SetPayoutAccountDto) {
    const vendor = await this.getMyVendorProfile(userId);
    const { accountName } = await this.flutterwaveService.resolveAccountName(
      dto.bankCode,
      dto.accountNumber,
    );
    const banks = await this.flutterwaveService.listBanks();
    const bankName =
      banks.find((bank) => bank.code === dto.bankCode)?.name ?? dto.bankCode;

    const payoutAccount: PayoutAccount = {
      bankCode: dto.bankCode,
      bankName,
      accountNumber: dto.accountNumber,
      accountName,
      verifiedAt: new Date().toISOString(),
    };

    return this.prisma.vendorProfile.update({
      where: { id: vendor.id },
      data: { payoutAccount: payoutAccount as unknown as object },
    });
  }

  listBanks() {
    return this.flutterwaveService.listBanks();
  }
}
