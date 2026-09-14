import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const [existing, paymentSettings] = await Promise.all([
      this.prisma.appSettings.findFirst(),
      // codEnabled and Google OAuth client IDs actually live on
      // PlatformPaymentSettings (managed via SUPER_ADMIN-only
      // /payment-settings/gateway routes) — merged in read-only here so the
      // mobile app and buyers can access them without admin privileges.
      this.prisma.platformPaymentSettings.findFirst({
        select: {
          codEnabled: true,
          googleClientId: true,
          googleAndroidClientId: true,
          googleIosClientId: true,
        },
      }),
    ]);
    const codEnabled = paymentSettings?.codEnabled ?? false;
    const googleClientId = paymentSettings?.googleClientId ?? null;
    const googleAndroidClientId = paymentSettings?.googleAndroidClientId ?? null;
    const googleIosClientId = paymentSettings?.googleIosClientId ?? null;

    if (existing) {
      return { ...existing, codEnabled, googleClientId, googleAndroidClientId, googleIosClientId };
    }
    const created = await this.prisma.appSettings.create({ data: {} });
    return { ...created, codEnabled, googleClientId, googleAndroidClientId, googleIosClientId };
  }

  async update(dto: UpdateSettingsDto) {
    const settings = await this.get();
    return this.prisma.appSettings.update({
      where: { id: settings.id },
      data: dto,
    });
  }
}
