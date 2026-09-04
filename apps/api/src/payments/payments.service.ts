import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  NotificationType,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  VendorOrderStatus,
  WalletTransactionType,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { NotificationsService } from "../notifications/notifications.service";
import { FlutterwaveService } from "./flutterwave/flutterwave.service";
import { OpayService, OpayCallbackPayload } from "./opay/opay.service";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";

export interface FlutterwaveWebhookBody {
  event?: string;
  data?: { tx_ref?: string };
}

export interface OpayWebhookBody {
  payload: OpayCallbackPayload;
  sha512: string;
  type: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly flutterwave: FlutterwaveService,
    private readonly opay: OpayService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  async initiate(userId: string, dto: InitiatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { buyer: true },
    });
    if (!order || order.buyerId !== userId) {
      throw new NotFoundException("Order not found");
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException("This order is not awaiting payment");
    }

    // Skips the gateway entirely rather than falling into the
    // FLUTTERWAVE/OPAY branches below — must be checked before them, not
    // folded into an `else`, since only two of the three providers ever
    // reach a real gateway call.
    if (dto.provider === PaymentProvider.COD) {
      return this.initiateCod(order);
    }

    const appUrl = this.configService.getOrThrow<string>("APP_URL");
    const reference = `IKS-${order.id}-${Date.now()}`;
    const amount = Number(order.totalAmount);
    const customerName = `${order.buyer.firstName} ${order.buyer.lastName}`;

    let checkoutUrl: string;

    if (dto.provider === PaymentProvider.FLUTTERWAVE) {
      const result = await this.flutterwave.initialize(
        reference,
        amount,
        order.currency,
        `${appUrl}/api/v1/payments/redirect/flutterwave?reference=${reference}`,
        {
          email: order.buyer.email,
          name: customerName,
          phoneNumber: order.buyer.phone ?? undefined,
        },
      );
      checkoutUrl = result.checkoutUrl;
    } else {
      const result = await this.opay.initialize(
        reference,
        Math.round(amount * 100),
        order.currency,
        `${appUrl}/api/v1/payments/redirect/opay?reference=${reference}`,
        `${appUrl}/api/v1/payments/webhook/opay`,
        {
          email: order.buyer.email,
          name: customerName,
          phone: order.buyer.phone ?? undefined,
        },
      );
      checkoutUrl = result.checkoutUrl;
    }

    await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: dto.provider,
        providerReference: reference,
        amount,
        currency: order.currency,
        status: PaymentStatus.INITIATED,
      },
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentProvider: dto.provider, paymentReference: reference },
    });

    return { checkoutUrl, reference };
  }

  /**
   * "Pay on delivery" — cash/card collected by the vendor in person instead
   * of through a gateway. Marks the order PAID and every VendorOrder under
   * it ACCEPTED immediately (no webhook to wait on), which is exactly what
   * markPaymentResult() does for a real gateway payment — from here on a
   * COD order flows through the same fulfillment pipeline as any other:
   * OrdersService.updateVendorOrderStatus() still only credits the vendor
   * and platform wallets on the DELIVERED transition, so "paid" here means
   * "confirmed, cash due at the door", not "money already collected".
   */
  private async initiateCod(order: Prisma.OrderGetPayload<{ include: { buyer: true } }>) {
    const settings = await this.prisma.platformPaymentSettings.findFirst();
    if (!settings?.codEnabled) {
      throw new BadRequestException("Pay on delivery is not available right now");
    }

    const reference = `COD-${order.id}-${Date.now()}`;
    const amount = Number(order.totalAmount);

    await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: PaymentProvider.COD,
        providerReference: reference,
        amount,
        currency: order.currency,
        status: PaymentStatus.SUCCESSFUL,
      },
    });

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
          paymentProvider: PaymentProvider.COD,
          paymentReference: reference,
        },
      }),
      this.prisma.vendorOrder.updateMany({
        where: { orderId: order.id },
        data: { status: VendorOrderStatus.ACCEPTED },
      }),
    ]);

    // Best-effort, same as the gateway path in markPaymentResult().
    await this.creditReferralBonusIfFirstOrder(order.id).catch((error) =>
      this.logger.error("Referral bonus crediting failed", error),
    );
    await this.notifyOrderConfirmed(order.id).catch((error) =>
      this.logger.error("Order-confirmed notification failed", error),
    );

    return { reference };
  }

  async handleFlutterwaveWebhook(
    rawBody: Buffer,
    signature: string | undefined,
    body: FlutterwaveWebhookBody,
  ) {
    if (!this.flutterwave.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException("Invalid Flutterwave webhook signature");
    }

    const txRef = body.data?.tx_ref;
    if (!txRef) {
      return { received: true };
    }

    const verification = await this.flutterwave.verifyByReference(txRef);
    await this.markPaymentResult(
      txRef,
      verification.status === "successful",
      verification.amount,
      verification.currency,
      body,
    );

    return { received: true };
  }

  async handleOpayWebhook(body: OpayWebhookBody) {
    if (!(await this.opay.verifyCallbackSignature(body.payload, body.sha512))) {
      throw new UnauthorizedException("Invalid Opay webhook signature");
    }

    const reference = body.payload.reference;
    const isSuccessful = body.payload.status === "SUCCESS";
    await this.markPaymentResult(
      reference,
      isSuccessful,
      Number(body.payload.amount) / 100,
      body.payload.currency,
      body,
    );

    return { received: true };
  }

  private async markPaymentResult(
    providerReference: string,
    successful: boolean,
    amount: number,
    currency: string,
    rawPayload: unknown,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { providerReference },
    });
    if (!payment) {
      this.logger.warn(
        `Received webhook for unknown payment reference ${providerReference}`,
      );
      return;
    }
    if (payment.status === PaymentStatus.SUCCESSFUL) {
      return; // idempotent: already processed
    }

    const amountMatches = Math.abs(Number(payment.amount) - amount) < 0.01;
    const currencyMatches = payment.currency === currency;

    if (!successful || !amountMatches || !currencyMatches) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          rawWebhookPayload: rawPayload as Prisma.InputJsonValue,
        },
      });
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.FAILED },
      });
      return;
    }

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESSFUL,
          rawWebhookPayload: rawPayload as Prisma.InputJsonValue,
        },
      }),
      this.prisma.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.PAID },
      }),
      this.prisma.vendorOrder.updateMany({
        where: { orderId: payment.orderId },
        data: { status: VendorOrderStatus.ACCEPTED },
      }),
    ]);

    // Best-effort, outside the transaction above: a failure here shouldn't
    // fail the payment webhook response the provider is waiting on.
    await this.creditReferralBonusIfFirstOrder(payment.orderId).catch((error) =>
      this.logger.error("Referral bonus crediting failed", error),
    );
    await this.notifyOrderConfirmed(payment.orderId).catch((error) =>
      this.logger.error("Order-confirmed notification failed", error),
    );
  }

  /**
   * Fires once an order is confirmed — either a real gateway payment
   * succeeded (markPaymentResult) or "pay on delivery" was selected
   * (initiateCod). Same three actions either way: an in-app notification
   * for the buyer, a broadcast notification for every admin, and an email
   * to the buyer — all best-effort, never allowed to fail the payment flow
   * they're attached to (see both call sites).
   */
  private async notifyOrderConfirmed(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { buyer: true },
    });
    if (!order) {
      return;
    }

    const orderNumber = order.id.slice(0, 8).toUpperCase();
    const buyerName = `${order.buyer.firstName} ${order.buyer.lastName}`;
    const amount = `${order.currency} ${Number(order.totalAmount).toLocaleString()}`;

    const buyerMessage =
      "Your order is confirmed and will be delivered within a few hours. " +
      "A rider will call you shortly to confirm your delivery location.";

    await this.notificationsService.create(
      order.buyerId,
      NotificationType.ORDER_CONFIRMED,
      "Order confirmed",
      buyerMessage,
      order.id,
    );

    await this.notificationsService.createAdminBroadcast(
      NotificationType.NEW_ORDER,
      "New order paid",
      `Order #${orderNumber} (${amount}) from ${buyerName} was just confirmed.`,
      order.id,
    );

    await this.emailService.send({
      to: order.buyer.email,
      subject: "Your Ikaystores order is confirmed",
      text:
        `Hi ${order.buyer.firstName},\n\n` +
        `Order #${orderNumber} (${amount}) is confirmed. ${buyerMessage}\n\n` +
        `— Ikaystores`,
      html:
        `<p>Hi ${order.buyer.firstName},</p>` +
        `<p>Order <strong>#${orderNumber}</strong> (${amount}) is confirmed. ${buyerMessage}</p>` +
        `<p>— Ikaystores</p>`,
    });
  }

  /**
   * Credits the referrer's buyer wallet the first (and only the first) time
   * a referred buyer's order is successfully paid — counting PAID-or-later
   * orders rather than gating on delivery, since delivery depends on vendor
   * action across potentially multiple vendor orders and a referral reward
   * should land close to the purchase, not be held hostage to fulfillment.
   */
  private async creditReferralBonusIfFirstOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { buyer: true },
    });
    if (!order?.buyer.referredById) {
      return;
    }

    const paidOrderCount = await this.prisma.order.count({
      where: {
        buyerId: order.buyerId,
        status: { in: [OrderStatus.PAID, OrderStatus.FULFILLING, OrderStatus.COMPLETED] },
      },
    });
    if (paidOrderCount !== 1) {
      return; // not their first successful order
    }

    const settings = await this.prisma.appSettings.findFirst();
    const bonusAmount = Number(settings?.referralBonusAmount ?? 500);
    if (bonusAmount <= 0) {
      return;
    }

    const referrerId = order.buyer.referredById;
    const wallet = await this.prisma.wallet.upsert({
      where: { buyerId: referrerId },
      create: { buyerId: referrerId },
      update: {},
    });
    const balanceAfter = Number(wallet.balance) + bonusAmount;
    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.CREDIT,
          amount: bonusAmount,
          balanceAfter,
          description: `Referral bonus — ${order.buyer.firstName} ${order.buyer.lastName}'s first order`,
        },
      }),
    ]);
  }

  async verifyByReference(userId: string, reference: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { providerReference: reference },
      include: { order: true },
    });
    if (!payment || payment.order.buyerId !== userId) {
      throw new NotFoundException("Payment not found");
    }
    return { status: payment.status, orderStatus: payment.order.status };
  }
}
