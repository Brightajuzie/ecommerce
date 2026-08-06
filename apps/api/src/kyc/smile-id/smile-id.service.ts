import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IDApi, JOB_TYPE } from "smile-identity-core";

export interface VerifyIdNumberParams {
  userId: string;
  idType: "NIN" | "BVN";
  idNumber: string;
}

// Smile ID's own id_type codes, which differ from the app-facing "NIN"/"BVN"
// shorthand: plain NIN lookups use the tokenized "NIN_V2" type. See
// https://docs.usesmileid.com/id-coverage/verify-with-id-number/nigeria —
// NIN_V2 additionally requires an enterprise_id from NIMC, registered
// through the Smile ID Dashboard, before it will work in production.
const SMILE_ID_TYPE_MAP: Record<"NIN" | "BVN", string> = {
  NIN: "NIN_V2",
  BVN: "BVN",
};

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
    return this.configService.get<string>("SMILE_ID_ENVIRONMENT") ===
      "production"
      ? 1
      : 0;
  }

  private ensureConfigured() {
    if (!this.partnerId || !this.apiKey) {
      throw new BadGatewayException(
        "Identity verification is not configured on this server",
      );
    }
  }

  /**
   * Real-time (synchronous) ID-number lookup — queries Smile ID's
   * `/id_verification` endpoint directly and gets the identity record back
   * in the same response, no webhook, no selfie/photo involved.
   */
  async verifyIdNumber(
    params: VerifyIdNumberParams,
  ): Promise<Record<string, unknown>> {
    this.ensureConfigured();

    const idApi = new IDApi(this.partnerId, this.apiKey, this.server);
    const jobId = `idverify-${params.userId}-${Date.now()}`;

    try {
      const response = await idApi.submit_job<Record<string, unknown>>(
        {
          user_id: params.userId,
          job_id: jobId,
          job_type: JOB_TYPE.BASIC_KYC,
        },
        {
          country: "NG",
          id_type: SMILE_ID_TYPE_MAP[params.idType],
          id_number: params.idNumber,
        },
      );
      return response;
    } catch (error) {
      this.logger.error("Smile ID id_verification failed", error);
      throw new BadGatewayException("Unable to verify that ID number right now");
    }
  }
}
