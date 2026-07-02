import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class AddressDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  label: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  line1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  city: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  state: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty()
  @IsString()
  @MinLength(7)
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
