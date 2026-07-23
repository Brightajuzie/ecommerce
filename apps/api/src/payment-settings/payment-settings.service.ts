import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { FlutterwaveService } from "../payments/flutterwave/flutterwave.service";
import { UpdatePaymentSettingsDto } from "./dto/update-payment-settings.dto";
import { SetPayoutAccountDto } from "./dto/set-payout-account.dto";

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
