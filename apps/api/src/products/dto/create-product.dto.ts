import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ProductStatus } from "@prisma/client";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  IsUUID,
  Min,
  MinLength,
} from "class-validator";

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  description: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiPropertyOptional({ default: "NGN" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  stock: number;

  @ApiProperty()
  @IsUUID()
  categoryId: string;

  // At least 1 so a listing is never imageless, capped at 4 to keep
  // listings quick to browse/upload — matches createProductSchema in
  // packages/shared/src/schemas/product.ts.
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  // require_tld: false so http://localhost:PORT/... (the local-disk upload
  // fallback used when Cloudinary isn't configured, e.g. in dev) validates —
  // a bare "localhost" host has no TLD and would otherwise be rejected.
  @IsUrl({ require_tld: false }, { each: true })
  images: string[];

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  // Free-text so a vendor can enter whatever unit makes sense for the
  // product (e.g. "5kg", "500g", "1 Litre", "Pack of 10").
  @ApiPropertyOptional({ example: "5kg" })
  @IsOptional()
  @IsString()
  weight?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;
}
