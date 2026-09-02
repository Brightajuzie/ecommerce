import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { VendorStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { FlutterwaveService } from "../payments/flutterwave/flutterwave.service";
import type { PayoutAccount } from "../payment-settings/payment-settings.service";
import { ApplyVendorDto } from "./dto/apply-vendor.dto";
import { SetPayoutAccountDto } from "./dto/set-payout-account.dto";
import { SetVendorDocumentsDto } from "./dto/set-vendor-documents.dto";

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
