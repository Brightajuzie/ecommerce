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

// Selfie-based liveness check via Dojah — currently surfaced only during
// vendor onboarding, alongside (not replacing) the NIN/BVN lookup above.
export const checkLivenessSchema = z.object({
  // Base64-encoded JPEG/PNG, no data-URI prefix — capped well above a
  // typical compressed selfie (~200-500KB) but still bounded so a client
  // bug can't post something absurd.
  imageBase64: z.string().min(100).max(8_000_000),
});
export type CheckLivenessInput = z.infer<typeof checkLivenessSchema>;
