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

@Injectable()
export class VendorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flutterwaveService: FlutterwaveService,
  ) {}

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
      data: { ...dto, userId, status: VendorStatus.PENDING },
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
    return this.prisma.vendorProfile.findMany({
      where: { status: VendorStatus.PENDING },
    });
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
    });
    if (!vendor) {
      throw new NotFoundException("No vendor profile found for this account");
    }
    return vendor;
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
