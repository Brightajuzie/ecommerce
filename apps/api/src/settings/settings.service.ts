import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const [existing, paymentSettings] = await Promise.all([
      this.prisma.appSettings.findFirst(),
      // codEnabled actually lives on PlatformPaymentSettings (managed via
      // the SUPER_ADMIN-only /payment-settings/gateway routes, alongside
      // the other gateway config) — merged in read-only here so a buyer at
      // checkout can see whether "Pay on delivery" is offered without
      // needing admin-level access to read it directly. update() below
      // never touches this field, since UpdateSettingsDto doesn't declare
      // it and the global ValidationPipe's whitelist silently strips
      // anything undeclared — writes stay exclusively through
      // PaymentSettingsService.
      this.prisma.platformPaymentSettings.findFirst({ select: { codEnabled: true } }),
    ]);
    const codEnabled = paymentSettings?.codEnabled ?? false;

    if (existing) {
      return { ...existing, codEnabled };
    }
    const created = await this.prisma.appSettings.create({ data: {} });
    return { ...created, codEnabled };
  }

  async update(dto: UpdateSettingsDto) {
    const settings = await this.get();
    return this.prisma.appSettings.update({
      where: { id: settings.id },
      data: dto,
    });
  }
}
