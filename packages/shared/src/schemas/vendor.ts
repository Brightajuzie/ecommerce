import { z } from "zod";

export const sendVendorMessageSchema = z.object({
  body: z.string().min(1).max(4000),
});
export type SendVendorMessageInput = z.infer<typeof sendVendorMessageSchema>;

// Admin-only (POST /vendors/broadcast) — same shape as a single message,
// fanned out to every vendor's thread. Kept as its own schema (not a reuse
// of sendVendorMessageSchema) so a UI form can tell the two apart by type
// even though the runtime validation is identical today.
export const broadcastMessageSchema = z.object({
  body: z.string().min(1).max(4000),
});
export type BroadcastMessageInput = z.infer<typeof broadcastMessageSchema>;

export const updateVendorSchema = z.object({
  businessName: z.string().min(2).optional(),
  description: z.string().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
});
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
