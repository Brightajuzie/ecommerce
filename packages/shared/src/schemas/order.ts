import { z } from "zod";
import { PaymentProvider, VendorOrderStatus } from "../enums";

export const checkoutSchema = z.object({
  addressId: z.string().uuid(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const initiatePaymentSchema = z.object({
  orderId: z.string().uuid(),
  provider: z.enum([PaymentProvider.FLUTTERWAVE, PaymentProvider.OPAY]),
});
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;

export const updateVendorOrderStatusSchema = z.object({
  status: z.enum([
    VendorOrderStatus.ACCEPTED,
    VendorOrderStatus.SHIPPED,
    VendorOrderStatus.DELIVERED,
    VendorOrderStatus.CANCELLED,
  ]),
});
export type UpdateVendorOrderStatusInput = z.infer<typeof updateVendorOrderStatusSchema>;
