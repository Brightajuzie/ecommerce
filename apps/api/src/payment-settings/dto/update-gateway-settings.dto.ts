import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateGatewaySettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  flutterwavePublicKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  flutterwaveSecretKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  flutterwaveEncryptionKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  opayMerchantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  opayPublicKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  opaySecretKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  supportEmail?: string;
}
