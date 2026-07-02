import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const existing = await this.prisma.appSettings.findFirst();
    if (existing) {
      return existing;
    }
    return this.prisma.appSettings.create({ data: {} });
  }

  async update(dto: UpdateSettingsDto) {
    const settings = await this.get();
    return this.prisma.appSettings.update({
      where: { id: settings.id },
      data: dto,
    });
  }
}
