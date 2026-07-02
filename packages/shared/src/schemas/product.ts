import { z } from "zod";
import { ProductStatus } from "../enums";

export const createProductSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(1).max(5000),
  price: z.number().positive(),
  currency: z.string().length(3).default("NGN"),
  stock: z.number().int().min(0),
  categoryId: z.string().uuid(),
  images: z.array(z.string().url()).min(1).max(10),
  status: z
    .enum([ProductStatus.DRAFT, ProductStatus.ACTIVE, ProductStatus.ARCHIVED])
    .default(ProductStatus.DRAFT),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const productQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  vendorId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
