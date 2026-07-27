import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, ProductStatus, UserRole, VendorStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductQueryDto } from "./dto/product-query.dto";
import { AdminProductQueryDto } from "./dto/admin-product-query.dto";

const ADMIN_ROLES = [UserRole.ADMIN, UserRole.SUPER_ADMIN] as const;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getVendorProfileOrThrow(userId: string) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!vendorProfile) {
      throw new ForbiddenException(
        "No vendor profile is associated with this account",
      );
    }
    if (vendorProfile.status !== VendorStatus.APPROVED) {
      throw new ForbiddenException("Your vendor account is not yet approved");
    }
    return vendorProfile;
  }

  async browse(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.vendorId ? { vendorId: query.vendorId } : {}),
      ...(query.minPrice || query.maxPrice
        ? {
            price: {
              ...(query.minPrice ? { gte: query.minPrice } : {}),
              ...(query.maxPrice ? { lte: query.maxPrice } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" } },
              { description: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, page, pageSize, total };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException("Product not found");
    }
    return product;
  }

  async listMine(userId: string) {
    const vendorProfile = await this.getVendorProfileOrThrow(userId);
    return this.prisma.product.findMany({
      where: { vendorId: vendorProfile.id },
      orderBy: { createdAt: "desc" },
    });
  }

  // Unlike browse(), this isn't filtered to ACTIVE/a single vendor — admin
  // moderation needs to see everything, including inactive/out-of-stock
  // listings from any vendor.
  async browseForAdmin(query: AdminProductQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.ProductWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.vendorId ? { vendorId: query.vendorId } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" } },
              { description: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: { vendor: { select: { businessName: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, page, pageSize, total };
  }

  async create(userId: string, dto: CreateProductDto) {
    const vendorProfile = await this.getVendorProfileOrThrow(userId);
    return this.prisma.product.create({
      data: { ...dto, vendorId: vendorProfile.id },
    });
  }

  async update(
    userId: string,
    productId: string,
    dto: UpdateProductDto,
    callerRole: UserRole = UserRole.VENDOR,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException("Product not found");
    }
    if (!ADMIN_ROLES.includes(callerRole as (typeof ADMIN_ROLES)[number])) {
      const vendorProfile = await this.getVendorProfileOrThrow(userId);
      if (product.vendorId !== vendorProfile.id) {
        throw new NotFoundException("Product not found");
      }
    }
    return this.prisma.product.update({ where: { id: productId }, data: dto });
  }

  async remove(
    userId: string,
    productId: string,
    callerRole: UserRole = UserRole.VENDOR,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException("Product not found");
    }
    if (!ADMIN_ROLES.includes(callerRole as (typeof ADMIN_ROLES)[number])) {
      const vendorProfile = await this.getVendorProfileOrThrow(userId);
      if (product.vendorId !== vendorProfile.id) {
        throw new NotFoundException("Product not found");
      }
    }
    await this.prisma.product.delete({ where: { id: productId } });
    return { success: true };
  }
}
