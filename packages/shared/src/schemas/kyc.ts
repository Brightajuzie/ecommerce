import { z } from "zod";

export const kycIdTypes = ["NIN", "BVN", "VOTER_ID", "DRIVERS_LICENSE", "PASSPORT"] as const;

export const submitKycSchema = z.object({
  idType: z.enum(kycIdTypes),
  idNumber: z.string().min(4).max(30),
  country: z.string().length(2).default("NG"),
});
export type SubmitKycInput = z.infer<typeof submitKycSchema>;

// Real-time NIN/BVN lookup (synchronous, no selfie) — distinct from the
// async Biometric KYC flow above, which SubmitKycDto/submitKycSchema serve.
export const identityVerificationTypes = ["NIN", "BVN"] as const;

export const verifyIdNumberSchema = z.object({
  idType: z.enum(identityVerificationTypes),
  idNumber: z.string().regex(/^\d{11}$/, "Must be exactly 11 digits"),
});
export type VerifyIdNumberInput = z.infer<typeof verifyIdNumberSchema>;
