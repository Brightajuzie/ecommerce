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

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  images: string[];

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
