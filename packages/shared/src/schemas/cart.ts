import { z } from "zod";

export const addCartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(999),
});
export type AddCartItemInput = z.infer<typeof addCartItemSchema>;

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(999),
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
