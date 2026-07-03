import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import * as crypto from "crypto";

export interface OpayCustomer {
  email?: string;
  name: string;
  phone?: string;
}

export interface InitializeResult {
  checkoutUrl: string;
}

export interface OpayCallbackPayload {
  amount: string;
  currency: string;
  reference: string;
  refunded: boolean;
  status: string;
  timestamp: string;
  token: string;
  transactionId: string;
}

interface OpayCreateResponse {
  data?: { cashierUrl?: string };
}

/**
 * Integrates with OPay's Cashier Checkout API. Endpoint paths/headers follow
 * OPay's documented "Cashier Create Payment" contract as of this writing;
 * reconfirm against the current merchant dashboard docs before going live,
 * since OPay's API surface differs across their product lines.
 */
@Injectable()
export class OpayService {
  private readonly logger = new Logger(OpayService.name);

  constructor(private readonly configService: ConfigService) {}

  private get baseUrl(): string {
    return this.configService.get<string>("NODE_ENV") === "production"
      ? "https://liveapi.opaycheckout.com"
      : "https://testapi.opaycheckout.com";
  }

  private get merchantId(): string {
    return this.configService.get<string>("OPAY_MERCHANT_ID", "");
  }

  private get publicKey(): string {
    return this.configService.get<string>("OPAY_PUBLIC_KEY", "");
  }

  private get secretKey(): string {
    return this.configService.get<string>("OPAY_SECRET_KEY", "");
  }

  async initialize(
    reference: string,
    amountKobo: number,
    currency: string,
    returnUrl: string,
    callbackUrl: string,
    customer: OpayCustomer,
  ): Promise<InitializeResult> {
    if (!this.publicKey || !this.merchantId) {
      throw new BadGatewayException("Opay is not configured on this server");
    }

    try {
      const response = await axios.post<OpayCreateResponse>(
        `${this.baseUrl}/api/v1/international/cashier/create`,
        {
          country: "NG",
          reference,
          amount: { total: amountKobo, currency },
          returnUrl,
          callbackUrl,
          product: { name: "IkStore order", description: `Order ${reference}` },
          userInfo: {
            userName: customer.name,
            userEmail: customer.email,
            userMobile: customer.phone,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.publicKey}`,
            MerchantId: this.merchantId,
            "Content-Type": "application/json",
          },
        },
      );

      const checkoutUrl = response.data?.data?.cashierUrl;
      if (!checkoutUrl) {
        throw new Error("Opay response did not include a cashier URL");
      }
      return { checkoutUrl };
    } catch (error) {
      this.logger.error("Opay initialize payment failed", error);
      throw new BadGatewayException("Unable to initialize Opay payment");
    }
  }

  /**
   * Verifies OPay's callback signature: HMAC-SHA3-512 over a fixed template
   * built from eight payload fields, keyed with the merchant's secret key.
   */
  verifyCallbackSignature(
    payload: OpayCallbackPayload,
    sha512: string | undefined,
  ): boolean {
    if (!sha512 || !this.secretKey) {
      return false;
    }

    const refundedFlag = payload.refunded ? "t" : "f";
    const template =
      `{Amount:"${payload.amount}",Currency:"${payload.currency}",` +
      `Reference:"${payload.reference}",Refunded:${refundedFlag},` +
      `Status:"${payload.status}",Timestamp:"${payload.timestamp}",` +
      `Token:"${payload.token}",TransactionID:"${payload.transactionId}"}`;

    const expected = crypto
      .createHmac("sha3-512", this.secretKey)
      .update(template)
      .digest("hex");

    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(sha512.toLowerCase());
    if (expectedBuf.length !== receivedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  }
}
