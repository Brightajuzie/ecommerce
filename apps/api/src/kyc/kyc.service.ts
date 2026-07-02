import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { VendorVerificationStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SmileIdService } from "./smile-id/smile-id.service";
import { SubmitKycDto } from "./dto/submit-kyc.dto";

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smileId: SmileIdService,
  ) {}

  async submit(userId: string, dto: SubmitKycDto, selfieBuffer: Buffer) {
    const vendorProfile = await this.getVendorProfileOrThrow(userId);

    const { jobId } = await this.smileId.submitBiometricKyc({
      vendorProfileId: vendorProfile.id,
      idType: dto.idType,
      idNumber: dto.idNumber,
      country: dto.country ?? "NG",
      selfieBuffer,
    });

    return this.prisma.vendorProfile.update({
      where: { id: vendorProfile.id },
      data: { verificationStatus: VendorVerificationStatus.PENDING, verificationJobId: jobId },
    });
  }

  async getStatus(userId: string) {
    const vendorProfile = await this.getVendorProfileOrThrow(userId);
    return {
      verificationStatus: vendorProfile.verificationStatus,
      verifiedAt: vendorProfile.verifiedAt,
    };
  }

  /**
   * Handles the async job-completion callback. `job_success` is the
   * documented top-level boolean on Smile ID's job status payload; the job
   * is correlated back to a vendor via the job_id we generated at submit
   * time (echoed back under partner_params, with a top-level fallback since
   * the exact callback nesting should be confirmed against a live sandbox
   * event before production use).
   */
  async handleWebhook(body: any, timestamp: string | number, signature: string) {
    if (!this.smileId.confirmWebhookSignature(timestamp, signature)) {
      this.logger.warn("Rejected Smile ID webhook with invalid signature");
      return { received: false };
    }

    const jobId: string | undefined = body?.job_id ?? body?.partner_params?.job_id;
    if (!jobId) {
      this.logger.warn("Smile ID webhook missing job_id");
      return { received: true };
    }

    const vendorProfile = await this.prisma.vendorProfile.findFirst({
      where: { verificationJobId: jobId },
    });
    if (!vendorProfile) {
      this.logger.warn(`Smile ID webhook for unknown job ${jobId}`);
      return { received: true };
    }

    const success = body?.job_success === true;
    await this.prisma.vendorProfile.update({
      where: { id: vendorProfile.id },
      data: {
        verificationStatus: success
          ? VendorVerificationStatus.VERIFIED
          : VendorVerificationStatus.FAILED,
        verifiedAt: success ? new Date() : null,
      },
    });

    return { received: true };
  }

  private async getVendorProfileOrThrow(userId: string) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendorProfile) {
      throw new NotFoundException("No vendor profile found for this account");
    }
    return vendorProfile;
  }
}
