import { z } from "zod";

export const addressSchema = z.object({
  label: z.string().min(1).max(50),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  country: z.string().min(1).max(100).default("Nigeria"),
  phone: z.string().min(7).max(20),
  isDefault: z.boolean().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;
