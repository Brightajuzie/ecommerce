import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ProductStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AddCartItemDto } from "./dto/add-cart-item.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateCart(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    return this.prisma.cart.findUniqueOrThrow({
      where: { id: cart.id },
      include: { items: { include: { product: true }, orderBy: { id: "asc" } } },
    });
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const cart = await this.getOrCreateCart(userId);
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException("Product not found");
    }
    if (product.stock < dto.quantity) {
      throw new BadRequestException("Insufficient stock for the requested quantity");
    }

    await this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId: product.id } },
      update: { quantity: { increment: dto.quantity }, priceAtAdd: product.price },
      create: {
        cartId: cart.id,
        productId: product.id,
        quantity: dto.quantity,
        priceAtAdd: product.price,
      },
    });

    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { product: true },
    });
    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException("Cart item not found");
    }
    if (item.product.stock < dto.quantity) {
      throw new BadRequestException("Insufficient stock for the requested quantity");
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException("Cart item not found");
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCart(userId);
  }
}
