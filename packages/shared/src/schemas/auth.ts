import { z } from "zod";
import { UserRole } from "../enums";

export const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().min(7).optional(),
    role: z.enum([UserRole.BUYER, UserRole.VENDOR]).default(UserRole.BUYER),
    businessName: z.string().min(2).optional(),
  })
  .refine((data) => data.role !== UserRole.VENDOR || !!data.businessName, {
    message: "businessName is required when registering as a vendor",
    path: ["businessName"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;
