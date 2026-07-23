import { z } from "zod";

export const requestWithdrawalSchema = z.object({
  amount: z.number().positive(),
});
export type RequestWithdrawalInput = z.infer<typeof requestWithdrawalSchema>;

export const rejectWithdrawalSchema = z.object({
  reason: z.string().optional(),
});
export type RejectWithdrawalInput = z.infer<typeof rejectWithdrawalSchema>;

export const setPayoutAccountSchema = z.object({
  bankCode: z.string().min(1),
  // NUBAN (Nigerian bank account numbers) are always 10 digits.
  accountNumber: z.string().length(10),
});
export type SetPayoutAccountInput = z.infer<typeof setPayoutAccountSchema>;

// The company/developer sum-to-100 check happens server-side in
// PaymentSettingsService — cross-field validation stays out of this schema,
// matching how other business rules are validated elsewhere in this codebase.
export const updatePaymentSettingsSchema = z.object({
  companySharePercent: z.number().min(0).max(100).optional(),
  developerSharePercent: z.number().min(0).max(100).optional(),
  superAdminFeePercent: z.number().min(0).max(100).optional(),
});
export type UpdatePaymentSettingsInput = z.infer<typeof updatePaymentSettingsSchema>;
