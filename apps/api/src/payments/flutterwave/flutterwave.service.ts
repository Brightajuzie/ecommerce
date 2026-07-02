import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import * as crypto from "crypto";

const FLW_BASE_URL = "https://api.flutterwave.com/v3";

export interface FlutterwaveCustomer {
  email: string;
  name: string;
  phoneNumber?: string;
}

export interface InitializeResult {
  checkoutUrl: string;
}

export interface VerifyResult {
  status: "successful" | "failed" | "pending";
  amount: number;
  currency: string;
  txRef: string;
}

@Injectable()
export class FlutterwaveService {
  private readonly logger = new Logger(FlutterwaveService.name);

  constructor(private readonly configService: ConfigService) {}

  private get secretKey(): string {
    return this.configService.get<string>("FLW_SECRET_KEY", "");
  }

  private get webhookSecret(): string {
    return this.configService.get<string>("FLW_WEBHOOK_HASH", "");
  }

  async initialize(
    txRef: string,
    amount: number,
    currency: string,
    redirectUrl: string,
    customer: FlutterwaveCustomer,
  ): Promise<InitializeResult> {
    if (!this.secretKey) {
      throw new BadGatewayException("Flutterwave is not configured on this server");
    }

    try {
      const response = await axios.post(
        `${FLW_BASE_URL}/payments`,
        {
          tx_ref: txRef,
          amount,
          currency,
          redirect_url: redirectUrl,
          customer: {
            email: customer.email,
            name: customer.name,
            phonenumber: customer.phoneNumber,
          },
          customizations: { title: "IkStore" },
        },
        { headers: { Authorization: `Bearer ${this.secretKey}` } },
      );

      const checkoutUrl = response.data?.data?.link;
      if (!checkoutUrl) {
        throw new Error("Flutterwave response did not include a checkout link");
      }
      return { checkoutUrl };
    } catch (error) {
      this.logger.error("Flutterwave initialize payment failed", error);
      throw new BadGatewayException("Unable to initialize Flutterwave payment");
    }
  }

  async verifyByReference(txRef: string): Promise<VerifyResult> {
    if (!this.secretKey) {
      throw new BadGatewayException("Flutterwave is not configured on this server");
    }

    try {
      const response = await axios.get(
        `${FLW_BASE_URL}/transactions/verify_by_reference`,
        {
          params: { tx_ref: txRef },
          headers: { Authorization: `Bearer ${this.secretKey}` },
        },
      );

      const data = response.data?.data;
      return {
        status: data?.status,
        amount: data?.amount,
        currency: data?.currency,
        txRef: data?.tx_ref,
      };
    } catch (error) {
      this.logger.error("Flutterwave verify transaction failed", error);
      throw new BadGatewayException("Unable to verify Flutterwave transaction");
    }
  }

  /**
   * Verifies the `flutterwave-signature` webhook header: HMAC-SHA256 over the
   * raw request body, base64-encoded, keyed with the configured webhook hash.
   */
  verifyWebhookSignature(rawBody: Buffer | string, signatureHeader: string | undefined): boolean {
    if (!signatureHeader || !this.webhookSecret) {
      return false;
    }
    const expected = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(rawBody)
      .digest("base64");
    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(signatureHeader);
    if (expectedBuf.length !== receivedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  }
}
