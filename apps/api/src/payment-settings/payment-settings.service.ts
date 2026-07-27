import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { FlutterwaveService } from "../payments/flutterwave/flutterwave.service";
import { UpdatePaymentSettingsDto } from "./dto/update-payment-settings.dto";
import { SetPayoutAccountDto } from "./dto/set-payout-account.dto";
import { UpdateGatewaySettingsDto } from "./dto/update-gateway-settings.dto";

// Only the last 4 characters are shown after saving, so a previously-set
// secret is never sent back to the client in full — the admin UI shows this
// to confirm a key is configured, and blank inputs on save mean "leave
// unchanged" (see updateGatewaySettings).
function maskSecret(value: string | null): string | null {
  if (!value) return null;
  return value.length <= 4 ? "••••" : `••••${value.slice(-4)}`;
}

export interface PayoutAccount {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  verifiedAt: string;
}

@Injectable()
export class PaymentSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flutterwaveService: FlutterwaveService,
  ) {}

  async get() {
    const existing = await this.prisma.platformPaymentSettings.findFirst();
    if (existing) {
      return existing;
    }
    return this.prisma.platformPaymentSettings.create({ data: {} });
  }

  async update(dto: UpdatePaymentSettingsDto) {
    const settings = await this.get();

    const companySharePercent =
      dto.companySharePercent ?? Number(settings.companySharePercent);
    const developerSharePercent =
      dto.developerSharePercent ?? Number(settings.developerSharePercent);

    if (Math.round((companySharePercent + developerSharePercent) * 100) / 100 !== 100) {
      throw new BadRequestException(
        "companySharePercent and developerSharePercent must sum to 100",
      );
    }

    return this.prisma.platformPaymentSettings.update({
      where: { id: settings.id },
      data: {
        companySharePercent,
        developerSharePercent,
        superAdminFeePercent:
          dto.superAdminFeePercent ?? settings.superAdminFeePercent,
      },
    });
  }

  async getGatewaySettings() {
    const settings = await this.get();
    return {
      flutterwavePublicKey: settings.flutterwavePublicKey,
      flutterwaveSecretKey: maskSecret(settings.flutterwaveSecretKey),
      flutterwaveEncryptionKey: maskSecret(settings.flutterwaveEncryptionKey),
      opayMerchantId: settings.opayMerchantId,
      opayPublicKey: settings.opayPublicKey,
      opaySecretKey: maskSecret(settings.opaySecretKey),
      supportEmail: settings.supportEmail,
    };
  }

  // Blank/omitted fields leave the existing stored value unchanged, since
  // the client only ever sees masked secrets and re-submitting a masked
  // value (e.g. "••••1234") back as-is would otherwise overwrite the real
  // secret with garbage.
  async updateGatewaySettings(dto: UpdateGatewaySettingsDto) {
    const settings = await this.get();
    await this.prisma.platformPaymentSettings.update({
      where: { id: settings.id },
      data: {
        flutterwavePublicKey: dto.flutterwavePublicKey || undefined,
        flutterwaveSecretKey: dto.flutterwaveSecretKey || undefined,
        flutterwaveEncryptionKey: dto.flutterwaveEncryptionKey || undefined,
        opayMerchantId: dto.opayMerchantId || undefined,
        opayPublicKey: dto.opayPublicKey || undefined,
        opaySecretKey: dto.opaySecretKey || undefined,
        supportEmail: dto.supportEmail || undefined,
      },
    });
    return this.getGatewaySettings();
  }

  async setPayoutAccount(dto: SetPayoutAccountDto) {
    const settings = await this.get();
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

    return this.prisma.platformPaymentSettings.update({
      where: { id: settings.id },
      data: { payoutAccount: payoutAccount as unknown as object },
    });
  }
}
