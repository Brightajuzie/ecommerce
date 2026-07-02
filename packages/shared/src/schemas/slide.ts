import { z } from "zod";

export const createSlideSchema = z.object({
  imageUrl: z.string().url(),
  title: z.string().max(200).optional(),
  linkUrl: z.string().url().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type CreateSlideInput = z.infer<typeof createSlideSchema>;

export const updateSlideSchema = createSlideSchema.partial();
export type UpdateSlideInput = z.infer<typeof updateSlideSchema>;

export const reorderSlidesSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});
export type ReorderSlidesInput = z.infer<typeof reorderSlidesSchema>;
