import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { type AxiosInstance } from "axios";
import { PrismaService } from "../../prisma/prisma.service";

export interface VerifyIdNumberParams {
  userId: string;
  idType: "NIN" | "BVN";
  idNumber: string;
}

export interface CheckLivenessParams {
  userId: string;
  /** Base64-encoded selfie image, no data-URI prefix. */
  imageBase64: string;
}

// Dojah's KYC lookup response envelope, per
// https://docs.dojah.io/reference/nin-lookup and
// https://docs.dojah.io/reference/bvn-lookup — { entity: { ...fields } } on
// success. Field names come back snake_case with separate first/middle/last
// name parts (unlike Smile ID's single "FullName"), composed into one
// fullName in kyc.service.ts.
//
// CAVEAT: implemented from Dojah's published docs, not verified against a
// live sandbox call (no DOJAH_APP_ID/DOJAH_SECRET_KEY configured in this
// dev environment) — same caveat this project already carries for its
// Flutterwave/Opay integrations. Confirm the exact field casing and the
// "not found" status code against a real sandbox request before relying on
// this in production.
interface DojahEntity {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  gender?: string;
  date_of_birth?: string;
  dob?: string;
  [key: string]: unknown;
}

@Injectable()
export class DojahService {
  private readonly logger = new Logger(DojahService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // DB value (set via the SUPER_ADMIN-only gateway settings screen, see
  // PaymentSettingsService.updateGatewaySettings) takes priority over the
  // env var, mirroring FlutterwaveService/OpayService — a fresh environment
  // still works from .env alone until an admin activates Dojah by pasting a
  // key into the app.
  private async getCredentials(): Promise<{
    appId: string;
    secretKey: string;
    baseUrl: string;
  }> {
    const settings = await this.prisma.platformPaymentSettings.findFirst();
    const appId =
      settings?.dojahAppId || this.configService.get<string>("DOJAH_APP_ID", "");
    const secretKey =
      settings?.dojahSecretKey ||
      this.configService.get<string>("DOJAH_SECRET_KEY", "");
    const environment =
      settings?.dojahEnvironment ||
      this.configService.get<string>("DOJAH_ENVIRONMENT", "");
    const baseUrl =
      environment === "production"
        ? "https://api.dojah.io"
        : "https://sandbox.dojah.io";
    return { appId, secretKey, baseUrl };
  }

  // Built fresh per call (not cached) since the credentials can change at
  // any time via the gateway settings screen — cheap enough at this app's
  // call volume, and avoids serving stale/rotated keys from a cached client.
  private async getClient(): Promise<AxiosInstance> {
    const { appId, secretKey, baseUrl } = await this.getCredentials();
    if (!appId || !secretKey) {
      throw new BadGatewayException(
        "Identity verification is not configured on this server",
      );
    }
    return axios.create({
      baseURL: baseUrl,
      headers: { AppId: appId, Authorization: secretKey },
      timeout: 15_000,
    });
  }

  /**
   * Real-time NIN/BVN lookup via Dojah — no selfie/photo capture involved,
   * matching the app's existing no-camera identity-verification design.
   * Returns the raw entity fields on a successful lookup, with `found:
   * false` (not a thrown error) when Dojah reports the ID number as
   * invalid/not on record — that's a normal "not verified" outcome for the
   * caller to handle, not a system failure. Only genuine transport/auth/
   * server errors throw.
   */
  async verifyIdNumber(
    params: VerifyIdNumberParams,
  ): Promise<{ found: boolean; entity: DojahEntity; message?: string }> {
    const client = await this.getClient();
    const path = params.idType === "NIN" ? "/api/v1/kyc/nin" : "/api/v1/kyc/bvn/full";
    const paramKey = params.idType === "NIN" ? "nin" : "bvn";

    try {
      const response = await client.get<{ entity: DojahEntity }>(path, {
        params: { [paramKey]: params.idNumber },
      });
      return { found: true, entity: response.data.entity ?? {} };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status >= 400 && status < 500) {
          // Dojah returns a 4xx (rather than a 200 with a "not found" flag)
          // when the ID number doesn't match a record — treat as a normal
          // unverified lookup, not a BadGatewayException.
          const body = error.response.data as { error?: string; message?: string } | undefined;
          this.logger.warn(
            `Dojah ${params.idType} lookup returned ${status}: ${body?.error ?? body?.message ?? "no detail"}`,
          );
          return { found: false, entity: {}, message: body?.error ?? body?.message };
        }
      }
      this.logger.error(
        `Dojah ${params.idType} lookup failed`,
        error instanceof Error ? error.stack : error,
      );
      throw new BadGatewayException("Unable to verify that ID number right now");
    }
  }

  /**
   * Liveness check via Dojah's ML endpoint — confirms the submitted selfie
   * is a real, live person (anti-spoofing), not a face match against an ID
   * document. Per https://docs.dojah.io/reference/liveness-check.
   *
   * CAVEAT: same as verifyIdNumber above — implemented from Dojah's
   * published docs, not verified against a live sandbox call. Confirm the
   * exact response field names/thresholds before relying on this in
   * production.
   */
  async checkLiveness(
    params: CheckLivenessParams,
  ): Promise<{ live: boolean; confidence: number | null }> {
    const client = await this.getClient();

    try {
      const response = await client.post<{
        entity: { liveness_check?: boolean; confidence_value?: number };
      }>("/api/v1/ml/liveness", { image: params.imageBase64 });
      const entity = response.data.entity ?? {};
      return {
        live: entity.liveness_check === true,
        confidence: typeof entity.confidence_value === "number" ? entity.confidence_value : null,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status >= 400 && status < 500) {
          // A rejected/low-quality selfie (no face detected, spoofed, etc.)
          // — a normal "not live" outcome, not a system error.
          const body = error.response.data as { error?: string; message?: string } | undefined;
          this.logger.warn(
            `Dojah liveness check returned ${status}: ${body?.error ?? body?.message ?? "no detail"}`,
          );
          return { live: false, confidence: null };
        }
      }
      this.logger.error(
        "Dojah liveness check failed",
        error instanceof Error ? error.stack : error,
      );
      throw new BadGatewayException("Unable to run the liveness check right now");
    }
  }
}
