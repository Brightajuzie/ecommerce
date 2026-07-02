import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  VendorOrderStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { FlutterwaveService } from "./flutterwave/flutterwave.service";
import { OpayService, OpayCallbackPayload } from "./opay/opay.service";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly flutterwave: FlutterwaveService,
    private readonly opay: OpayService,
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
        { email: order.buyer.email, name: customerName, phoneNumber: order.buyer.phone ?? undefined },
      );
      checkoutUrl = result.checkoutUrl;
    } else {
      const result = await this.opay.initialize(
        reference,
        Math.round(amount * 100),
        order.currency,
        `${appUrl}/api/v1/payments/redirect/opay?reference=${reference}`,
        `${appUrl}/api/v1/payments/webhook/opay`,
        { email: order.buyer.email, name: customerName, phone: order.buyer.phone ?? undefined },
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

  async handleFlutterwaveWebhook(rawBody: Buffer, signature: string | undefined, body: any) {
    if (!this.flutterwave.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException("Invalid Flutterwave webhook signature");
    }

    const txRef: string | undefined = body?.data?.tx_ref;
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

  async handleOpayWebhook(body: { payload: OpayCallbackPayload; sha512: string; type: string }) {
    if (!this.opay.verifyCallbackSignature(body.payload, body.sha512)) {
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
    const payment = await this.prisma.payment.findUnique({ where: { providerReference } });
    if (!payment) {
      this.logger.warn(`Received webhook for unknown payment reference ${providerReference}`);
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
        data: { status: PaymentStatus.FAILED, rawWebhookPayload: rawPayload as any },
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
        data: { status: PaymentStatus.SUCCESSFUL, rawWebhookPayload: rawPayload as any },
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
