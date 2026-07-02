import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSlideDto } from "./dto/create-slide.dto";
import { UpdateSlideDto } from "./dto/update-slide.dto";
import { ReorderSlidesDto } from "./dto/reorder-slides.dto";

@Injectable()
export class SlidesService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive() {
    return this.prisma.slide.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  async listAll() {
    return this.prisma.slide.findMany({ orderBy: { sortOrder: "asc" } });
  }

  async create(dto: CreateSlideDto) {
    return this.prisma.slide.create({ data: dto });
  }

  async update(id: string, dto: UpdateSlideDto) {
    await this.findOrThrow(id);
    return this.prisma.slide.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOrThrow(id);
    await this.prisma.slide.delete({ where: { id } });
    return { success: true };
  }

  async reorder(dto: ReorderSlidesDto) {
    await this.prisma.$transaction(
      dto.orderedIds.map((id, index) =>
        this.prisma.slide.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    return this.listAll();
  }

  private async findOrThrow(id: string) {
    const slide = await this.prisma.slide.findUnique({ where: { id } });
    if (!slide) {
      throw new NotFoundException("Slide not found");
    }
    return slide;
  }
}
