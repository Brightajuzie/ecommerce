import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, VendorOrderStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CheckoutDto } from "./dto/checkout.dto";
import { UpdateVendorOrderStatusDto } from "./dto/update-vendor-order-status.dto";

const ORDER_INCLUDE = {
  vendorOrders: { include: { items: true } },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async checkout(userId: string, dto: CheckoutDto) {
    const address = await this.prisma.address.findUnique({
      where: { id: dto.addressId },
    });
    if (!address || address.userId !== userId) {
      throw new NotFoundException("Address not found");
    }

    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: { include: { product: { include: { vendor: true } } } },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException("Your cart is empty");
    }

    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${item.product.title}"`,
        );
      }
    }

    const itemsByVendor = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      const list = itemsByVendor.get(item.product.vendorId) ?? [];
      list.push(item);
      itemsByVendor.set(item.product.vendorId, list);
    }

    const totalAmount = cart.items.reduce(
      (sum, item) => sum + Number(item.priceAtAdd) * item.quantity,
      0,
    );
    const currency = cart.items[0].product.currency;

    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          buyerId: userId,
          addressId: dto.addressId,
          totalAmount,
          currency,
        },
      });

      for (const [vendorId, items] of itemsByVendor) {
        const subtotal = items.reduce(
          (sum, item) => sum + Number(item.priceAtAdd) * item.quantity,
          0,
        );
        const commissionRate = Number(items[0].product.vendor.commissionRate);
        const commissionAmount =
          Math.round(subtotal * (commissionRate / 100) * 100) / 100;
        const vendorPayoutAmount =
          Math.round((subtotal - commissionAmount) * 100) / 100;

        await tx.vendorOrder.create({
          data: {
            orderId: createdOrder.id,
            vendorId,
            subtotal,
            commissionAmount,
            vendorPayoutAmount,
            items: {
              create: items.map((item) => ({
                productId: item.productId,
                title: item.product.title,
                price: item.priceAtAdd,
                quantity: item.quantity,
              })),
            },
          },
        });

        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return tx.order.findUniqueOrThrow({
        where: { id: createdOrder.id },
        include: ORDER_INCLUDE,
      });
    });

    return order;
  }

  async findMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { buyerId: userId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  async findMyOrderById(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    if (!order || order.buyerId !== userId) {
      throw new NotFoundException("Order not found");
    }
    return order;
  }

  async findVendorOrders(userId: string) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!vendorProfile) {
      throw new ForbiddenException(
        "No vendor profile is associated with this account",
      );
    }

    return this.prisma.vendorOrder.findMany({
      where: { vendorId: vendorProfile.id },
      include: {
        items: true,
        order: { select: { id: true, status: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateVendorOrderStatus(
    userId: string,
    vendorOrderId: string,
    dto: UpdateVendorOrderStatusDto,
  ) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!vendorProfile) {
      throw new ForbiddenException(
        "No vendor profile is associated with this account",
      );
    }

    const vendorOrder = await this.prisma.vendorOrder.findUnique({
      where: { id: vendorOrderId },
    });
    if (!vendorOrder || vendorOrder.vendorId !== vendorProfile.id) {
      throw new NotFoundException("Order not found");
    }
    if (vendorOrder.status === VendorOrderStatus.PENDING) {
      throw new BadRequestException(
        "Cannot update an order that has not been paid for yet",
      );
    }

    return this.prisma.vendorOrder.update({
      where: { id: vendorOrderId },
      data: { status: dto.status },
    });
  }
}
