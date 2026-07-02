import { z } from "zod";

export const kycIdTypes = ["NIN", "BVN", "VOTER_ID", "DRIVERS_LICENSE", "PASSPORT"] as const;

export const submitKycSchema = z.object({
  idType: z.enum(kycIdTypes),
  idNumber: z.string().min(4).max(30),
  country: z.string().length(2).default("NG"),
});
export type SubmitKycInput = z.infer<typeof submitKycSchema>;
