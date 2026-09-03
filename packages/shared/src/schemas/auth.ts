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
    referralCode: z.string().min(1).optional(),
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

// Same address shape as createAddressSchema minus isDefault — a guest
// checkout's address is always the one created, always the default.
const guestAddressSchema = z.object({
  label: z.string().min(1).optional(),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().optional(),
  phone: z.string().min(7),
});

// POST /auth/guest-checkout — completes a purchase without registering
// first; see AuthService.guestCheckout for the account this creates behind
// the scenes.
export const guestCheckoutSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(7).optional(),
  address: guestAddressSchema,
});
export type GuestCheckoutInput = z.infer<typeof guestCheckoutSchema>;

export const setPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
