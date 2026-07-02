import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WebApi, Signature, JOB_TYPE, IMAGE_TYPE } from "smile-identity-core";

export interface SubmitBiometricKycParams {
  vendorProfileId: string;
  idType: string;
  idNumber: string;
  country: string;
  selfieBuffer: Buffer;
}

@Injectable()
export class SmileIdService {
  private readonly logger = new Logger(SmileIdService.name);

  constructor(private readonly configService: ConfigService) {}

  private get partnerId(): string {
    return this.configService.get<string>("SMILE_ID_PARTNER_ID", "");
  }

  private get apiKey(): string {
    return this.configService.get<string>("SMILE_ID_API_KEY", "");
  }

  private get server(): number {
    return this.configService.get<string>("SMILE_ID_ENVIRONMENT") === "production" ? 1 : 0;
  }

  private get callbackUrl(): string {
    const appUrl = this.configService.getOrThrow<string>("APP_URL");
    return `${appUrl}/api/v1/kyc/webhook`;
  }

  private ensureConfigured() {
    if (!this.partnerId || !this.apiKey) {
      throw new BadGatewayException("Identity verification is not configured on this server");
    }
  }

  /**
   * Submits a Biometric KYC job (selfie matched against a national ID record).
   * Fire-and-forget: the result arrives asynchronously via the /kyc/webhook
   * callback, not in this response.
   */
  async submitBiometricKyc(params: SubmitBiometricKycParams): Promise<{ jobId: string }> {
    this.ensureConfigured();

    const webApi = new WebApi(this.partnerId, this.callbackUrl, this.apiKey, this.server);
    const jobId = `${params.vendorProfileId}-${Date.now()}`;

    try {
      await webApi.submit_job(
        { user_id: params.vendorProfileId, job_id: jobId, job_type: JOB_TYPE.BIOMETRIC_KYC },
        [
          {
            image_type_id: IMAGE_TYPE.SELFIE_IMAGE_BASE64,
            image: params.selfieBuffer.toString("base64"),
          },
        ],
        { id_type: params.idType, id_number: params.idNumber, country: params.country },
        { return_job_status: false },
      );
      return { jobId };
    } catch (error) {
      this.logger.error("Smile ID submit_job failed", error);
      throw new BadGatewayException("Unable to submit identity verification");
    }
  }

  /**
   * Verifies the signature/timestamp pair Smile ID sends with webhook
   * callbacks, using the same HMAC scheme as outbound request signing.
   */
  confirmWebhookSignature(timestamp: string | number, signature: string): boolean {
    if (!this.partnerId || !this.apiKey || !signature || !timestamp) {
      return false;
    }
    const sig = new Signature(this.partnerId, this.apiKey);
    return sig.confirm_signature(timestamp, signature);
  }
}
