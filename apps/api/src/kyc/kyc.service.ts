import { BadRequestException, Injectable } from "@nestjs/common";
import { IdentityVerificationStatus, IdentityVerificationType } from "@prisma/client";
import type { IdentityVerificationResultDto } from "@ikaystores/shared";
import { PrismaService } from "../prisma/prisma.service";
import { SmileIdService } from "./smile-id/smile-id.service";
import { VerifyIdNumberDto } from "./dto/verify-id-number.dto";

// Smile ID's synchronous ID-verification response isn't strongly typed by
// their SDK (returns Record<string, unknown>) and the exact key casing for
// this endpoint hasn't been confirmed against a live sandbox call — these
// are the field names documented at
// https://docs.usesmileid.com/id-coverage/verify-with-id-number/nigeria.
// Read defensively so an unexpected casing degrades to "not verified"
// rather than throwing.
function readField(response: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = response[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smileId: SmileIdService,
  ) {}

  /**
   * Real-time NIN/BVN lookup available to any authenticated user — this is
   * the app's identity-verification mechanism for both buyers and vendors
   * (vendor application review reuses it instead of a selfie-based check).
   * Persists only a minimal audit row (masked ID number, name on record,
   * result code) and never the full ID number or other PII (DOB, phone,
   * address) returned by the provider.
   */
  async verifyIdNumber(
    userId: string,
    dto: VerifyIdNumberDto,
  ): Promise<IdentityVerificationResultDto> {
    const idNumberLast4 = dto.idNumber.slice(-4);
    const idType = dto.idType as IdentityVerificationType;

    let response: Record<string, unknown>;
    try {
      response = await this.smileId.verifyIdNumber({
        userId,
        idType: dto.idType,
        idNumber: dto.idNumber,
      });
    } catch (error) {
      await this.prisma.identityVerification.create({
        data: {
          userId,
          idType,
          idNumberLast4,
          status: IdentityVerificationStatus.ERROR,
        },
      });
      throw error;
    }

    const resultCode = readField(response, "ResultCode", "result_code");
    const resultText = readField(response, "ResultText", "result_text");
    const fullName = readField(response, "FullName", "full_name");
    const dateOfBirth = readField(response, "DOB", "date_of_birth", "DateOfBirth");
    const gender = readField(response, "Gender", "gender");
    const actions = response["Actions"] as Record<string, unknown> | undefined;
    const verified =
      resultCode === "1012" ||
      (typeof actions?.["Verify_ID_Number"] === "string" &&
        actions["Verify_ID_Number"] === "Verified");

    await this.prisma.identityVerification.create({
      data: {
        userId,
        idType,
        idNumberLast4,
        status: verified
          ? IdentityVerificationStatus.VERIFIED
          : IdentityVerificationStatus.FAILED,
        resultCode,
        resultText,
        fullName,
      },
    });

    if (!verified) {
      throw new BadRequestException(
        resultText ?? "We couldn't verify that ID number. Please check it and try again.",
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { identityVerified: true, identityVerifiedAt: new Date() },
    });

    return {
      verified: true,
      idType: dto.idType,
      fullName,
      dateOfBirth,
      gender,
      message: resultText ?? "ID number verified",
    };
  }
}
