import { z } from "zod";

// Real-time NIN/BVN lookup (synchronous, no selfie) — the app's only
// identity-verification mechanism (used by both buyers and, for vendor
// application review, vendors).
export const identityVerificationTypes = ["NIN", "BVN"] as const;

export const verifyIdNumberSchema = z.object({
  idType: z.enum(identityVerificationTypes),
  idNumber: z.string().regex(/^\d{11}$/, "Must be exactly 11 digits"),
});
export type VerifyIdNumberInput = z.infer<typeof verifyIdNumberSchema>;
