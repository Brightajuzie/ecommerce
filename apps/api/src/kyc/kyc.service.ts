import { BadRequestException, Injectable } from "@nestjs/common";
import { IdentityVerificationStatus, IdentityVerificationType } from "@prisma/client";
import type { IdentityVerificationResultDto, LivenessCheckResultDto } from "@ikaystores/shared";
import { PrismaService } from "../prisma/prisma.service";
import { DojahService } from "./dojah/dojah.service";
import { VerifyIdNumberDto } from "./dto/verify-id-number.dto";
import { CheckLivenessDto } from "./dto/check-liveness.dto";

function composeFullName(entity: Record<string, unknown>): string | null {
  const parts = [entity["first_name"], entity["middle_name"], entity["last_name"]]
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0);
  return parts.length > 0 ? parts.join(" ") : null;
}

function readString(entity: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = entity[key];
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
    private readonly dojah: DojahService,
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

    let result: { found: boolean; entity: Record<string, unknown>; message?: string };
    try {
      result = await this.dojah.verifyIdNumber({
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

    const fullName = composeFullName(result.entity);
    const dateOfBirth = readString(result.entity, "date_of_birth", "dob");
    const gender = readString(result.entity, "gender");
    const verified = result.found && !!fullName;
    const resultText = verified
      ? "ID number verified"
      : (result.message ?? "We couldn't verify that ID number. Please check it and try again.");

    await this.prisma.identityVerification.create({
      data: {
        userId,
        idType,
        idNumberLast4,
        status: verified
          ? IdentityVerificationStatus.VERIFIED
          : IdentityVerificationStatus.FAILED,
        resultCode: verified ? "FOUND" : "NOT_FOUND",
        resultText,
        fullName,
      },
    });

    if (!verified) {
      throw new BadRequestException(resultText);
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
      message: resultText,
    };
  }

  /**
   * Selfie-based liveness check via Dojah — confirms a real, live person
   * submitted the photo (anti-spoofing), separate from the NIN/BVN identity
   * lookup above. Currently only surfaced during vendor onboarding. Only
   * the pass/fail result and confidence score are persisted; the selfie
   * image itself is never stored (sent straight through to Dojah, not
   * saved to our own DB or Cloudinary).
   */
  async checkLiveness(
    userId: string,
    dto: CheckLivenessDto,
  ): Promise<LivenessCheckResultDto> {
    const result = await this.dojah.checkLiveness({ userId, imageBase64: dto.imageBase64 });

    if (result.live) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { livenessVerified: true, livenessVerifiedAt: new Date() },
      });
    }

    return {
      live: result.live,
      confidence: result.confidence,
      message: result.live
        ? "Liveness check passed"
        : "We couldn't confirm liveness from that photo. Make sure you're in good lighting and try again.",
    };
  }
}
