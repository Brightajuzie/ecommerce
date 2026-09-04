import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color like #111827");

export const updateSettingsSchema = z.object({
  primaryColor: hexColor.optional(),
  secondaryColor: hexColor.optional(),
  accentColor: hexColor.optional(),
  logoUrl: z.string().url().optional(),
  referralBonusAmount: z.number().min(0).optional(),
  deliveryFee: z.number().min(0).optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
