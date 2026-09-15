import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, VendorOrderStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PaymentSettingsService } from "../payment-settings/payment-settings.service";
import { WalletsService } from "../wallets/wallets.service";
import { CheckoutDto } from "./dto/checkout.dto";
import { UpdateVendorOrderStatusDto } from "./dto/update-vendor-order-status.dto";

const ORDER_INCLUDE = {
  vendorOrders: { include: { items: true } },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentSettingsService: PaymentSettingsService,
    private readonly walletsService: WalletsService,
  ) {}

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
    // Re-checked with a conditional decrement inside the transaction below
    // (WHERE stock >= quantity) — this earlier check is just a fast-path
    // rejection with a specific product name; it can't by itself prevent two
    // concurrent checkouts from both passing it and then both decrementing,
    // which is the actual race the in-transaction guard closes.

    const itemsByVendor = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      const list = itemsByVendor.get(item.product.vendorId) ?? [];
      list.push(item);
      itemsByVendor.set(item.product.vendorId, list);
    }

    const itemsSubtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.priceAtAdd) * item.quantity,
      0,
    );
    const currency = cart.items[0].product.currency;

    // Flat, platform-wide — not per vendor, so it isn't folded into any
    // VendorOrder's subtotal/commission math below and doesn't affect
    // vendor payouts. Snapshotted onto the order (not just added into
    // totalAmount) so the receipt can still show the split later even if
    // an admin changes the fee afterward.
    const appSettings = await this.prisma.appSettings.findFirst();
    const deliveryFee = Number(appSettings?.deliveryFee ?? 0);
    const totalAmount = itemsSubtotal + deliveryFee;

    const paymentSettings = await this.paymentSettingsService.get();
    const companySharePercent = Number(paymentSettings.companySharePercent);
    const developerSharePercent = Number(paymentSettings.developerSharePercent);
    const superAdminFeePercent = Number(paymentSettings.superAdminFeePercent);

    const order = await this.prisma.$transaction(
      async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          buyerId: userId,
          addressId: dto.addressId,
          deliveryFee,
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
        // companyAmount/developerAmount subdivide commissionAmount itself
        // (not the vendor's cut) — developerAmount takes the rounding
        // remainder so the two always sum exactly back to commissionAmount.
        const companyAmount =
          Math.round(commissionAmount * (companySharePercent / 100) * 100) / 100;
        const developerAmount =
          Math.round((commissionAmount - companyAmount) * 100) / 100;
        // Flat extra cut of the sale itself, independent of the commission split.
        const superAdminAmount =
          Math.round(subtotal * (superAdminFeePercent / 100) * 100) / 100;

        await tx.vendorOrder.create({
          data: {
            orderId: createdOrder.id,
            vendorId,
            subtotal,
            commissionAmount,
            vendorPayoutAmount,
            companyAmount,
            developerAmount,
            superAdminAmount,
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

        // updateMany + a stock >= quantity guard (rather than a plain
        // update() with decrement) closes the race between this and any
        // other concurrent checkout of the same product: only one of them
        // can win the conditional update once stock is too low, and the
        // other gets a count of 0 here instead of driving stock negative.
        // Run in parallel — each targets a different product row, so
        // there's no cross-item contention, and it keeps the whole
        // transaction well inside its timeout even for a large cart.
        const decrements = await Promise.all(
          items.map((item) =>
            tx.product.updateMany({
              where: { id: item.productId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            }),
          ),
        );
        const raceLoser = items.find((_, i) => decrements[i].count === 0);
        if (raceLoser) {
          throw new BadRequestException(
            `Insufficient stock for "${raceLoser.product.title}"`,
          );
        }
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return tx.order.findUniqueOrThrow({
        where: { id: createdOrder.id },
        include: ORDER_INCLUDE,
      });
      },
      // Prisma's default interactive-transaction timeout is 5s, which this
      // multi-step transaction (order + per-vendor writes + stock updates)
      // can exceed under ordinary pooled-connection latency, well before
      // anything is actually wrong — surfacing as "Transaction already
      // closed... timeout was 5000 ms" and failing checkout outright.
      // Generous but bounded headroom instead of Prisma's default.
      { maxWait: 10000, timeout: 20000 },
    );

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

    // Wallets are credited on delivery, not on payment — there's no
    // refund/dispute system yet, so this is the safest point to treat the
    // money as actually owed. Guarded by the status check above (PENDING
    // rejected) and the transition check below (no double-crediting).
    const isNewlyDelivered =
      dto.status === VendorOrderStatus.DELIVERED &&
      vendorOrder.status !== VendorOrderStatus.DELIVERED;

    if (!isNewlyDelivered) {
      return this.prisma.vendorOrder.update({
        where: { id: vendorOrderId },
        data: { status: dto.status },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.vendorOrder.update({
        where: { id: vendorOrderId },
        data: { status: dto.status },
      });

      await this.walletsService.creditVendorWallet(
        tx,
        vendorOrder.vendorId,
        Number(vendorOrder.vendorPayoutAmount),
        `Order delivered (${vendorOrderId})`,
        vendorOrderId,
      );
      await this.walletsService.creditPlatformWallet(
        tx,
        Number(vendorOrder.superAdminAmount),
        `Super-admin fee (${vendorOrderId})`,
        vendorOrderId,
      );

      return updated;
    }, { maxWait: 10000, timeout: 15000 });
  }
}
