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

interface FlutterwavePaymentResponse {
  data?: { link?: string };
}

interface FlutterwaveVerifyResponse {
  data?: {
    status?: "successful" | "failed" | "pending";
    amount?: number;
    currency?: string;
    tx_ref?: string;
  };
}

export interface TransferResult {
  transferId: string;
}

export interface ResolvedAccount {
  accountName: string;
}

export interface Bank {
  code: string;
  name: string;
}

interface FlutterwaveTransferResponse {
  data?: { id?: number };
}

interface FlutterwaveResolveResponse {
  data?: { account_name?: string };
}

interface FlutterwaveBanksResponse {
  data?: { code: string; name: string }[];
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
      throw new BadGatewayException(
        "Flutterwave is not configured on this server",
      );
    }

    try {
      const response = await axios.post<FlutterwavePaymentResponse>(
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
          customizations: { title: "Ikaystores" },
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
      throw new BadGatewayException(
        "Flutterwave is not configured on this server",
      );
    }

    try {
      const response = await axios.get<FlutterwaveVerifyResponse>(
        `${FLW_BASE_URL}/transactions/verify_by_reference`,
        {
          params: { tx_ref: txRef },
          headers: { Authorization: `Bearer ${this.secretKey}` },
        },
      );

      const data = response.data?.data;
      return {
        status: data?.status ?? "failed",
        amount: data?.amount ?? 0,
        currency: data?.currency ?? "",
        txRef: data?.tx_ref ?? txRef,
      };
    } catch (error) {
      this.logger.error("Flutterwave verify transaction failed", error);
      throw new BadGatewayException("Unable to verify Flutterwave transaction");
    }
  }

  /**
   * Initiates a payout to a Nigerian bank account via Flutterwave's Transfers
   * API. Result is asynchronous — the transfer's final status arrives via the
   * `transfer.completed` webhook event, not this call's response.
   */
  async initiateTransfer(
    reference: string,
    amount: number,
    currency: string,
    bankCode: string,
    accountNumber: string,
    narration: string,
  ): Promise<TransferResult> {
    if (!this.secretKey) {
      throw new BadGatewayException(
        "Flutterwave is not configured on this server",
      );
    }

    try {
      const response = await axios.post<FlutterwaveTransferResponse>(
        `${FLW_BASE_URL}/transfers`,
        {
          account_bank: bankCode,
          account_number: accountNumber,
          amount,
          currency,
          narration,
          reference,
        },
        { headers: { Authorization: `Bearer ${this.secretKey}` } },
      );

      const transferId = response.data?.data?.id;
      if (transferId === undefined) {
        throw new Error("Flutterwave response did not include a transfer id");
      }
      return { transferId: String(transferId) };
    } catch (error) {
      this.logger.error("Flutterwave initiate transfer failed", error);
      throw new BadGatewayException("Unable to initiate Flutterwave transfer");
    }
  }

  /**
   * Verifies a bank account name before saving it as a payout destination —
   * catches typo'd account numbers before money is sent to the wrong person.
   */
  async resolveAccountName(
    bankCode: string,
    accountNumber: string,
  ): Promise<ResolvedAccount> {
    if (!this.secretKey) {
      throw new BadGatewayException(
        "Flutterwave is not configured on this server",
      );
    }

    try {
      const response = await axios.post<FlutterwaveResolveResponse>(
        `${FLW_BASE_URL}/accounts/resolve`,
        { account_bank: bankCode, account_number: accountNumber },
        { headers: { Authorization: `Bearer ${this.secretKey}` } },
      );

      const accountName = response.data?.data?.account_name;
      if (!accountName) {
        throw new Error("Flutterwave response did not include an account name");
      }
      return { accountName };
    } catch (error) {
      this.logger.error("Flutterwave resolve account failed", error);
      throw new BadGatewayException(
        "Unable to verify the bank account with Flutterwave",
      );
    }
  }

  /** Powers the mobile bank picker instead of free-text bank codes. */
  async listBanks(country = "NG"): Promise<Bank[]> {
    if (!this.secretKey) {
      throw new BadGatewayException(
        "Flutterwave is not configured on this server",
      );
    }

    try {
      const response = await axios.get<FlutterwaveBanksResponse>(
        `${FLW_BASE_URL}/banks/${country}`,
        { headers: { Authorization: `Bearer ${this.secretKey}` } },
      );

      return (response.data?.data ?? []).map((bank) => ({
        code: bank.code,
        name: bank.name,
      }));
    } catch (error) {
      this.logger.error("Flutterwave list banks failed", error);
      throw new BadGatewayException("Unable to fetch the bank list from Flutterwave");
    }
  }

  /**
   * Verifies the `flutterwave-signature` webhook header: HMAC-SHA256 over the
   * raw request body, base64-encoded, keyed with the configured webhook hash.
   */
  verifyWebhookSignature(
    rawBody: Buffer | string,
    signatureHeader: string | undefined,
  ): boolean {
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
