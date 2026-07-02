import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCategoryDto } from "./dto/create-category.dto";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.category.findMany({ orderBy: { name: "asc" } });
  }

  async create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }
}
