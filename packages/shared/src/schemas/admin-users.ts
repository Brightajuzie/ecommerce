import { z } from "zod";
import { UserRole } from "../enums";

// Every role is a valid value here — which ones a given caller can actually
// assign is enforced server-side in users.service.ts's manageableRolesFor
// (SUPER_ADMIN can grant any role; a regular ADMIN can grant BUYER/VENDOR/
// EDITOR but not ADMIN/SUPER_ADMIN), not by this schema.
export const adminCreateUserSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().min(7).optional(),
    role: z.nativeEnum(UserRole).default(UserRole.BUYER),
    businessName: z.string().min(2).optional(),
  })
  .refine((data) => data.role !== UserRole.VENDOR || !!data.businessName, {
    message: "businessName is required when creating a vendor account",
    path: ["businessName"],
  });
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

export const adminUpdateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  role: z.nativeEnum(UserRole).optional(),
  businessName: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
});
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
