import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  dojahAppId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  dojahSecretKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(["sandbox", "production"])
  dojahEnvironment?: string;

  @ApiPropertyOptional({ description: "Whether \"Pay on delivery\" is offered at checkout" })
  @IsOptional()
  @IsBoolean()
  codEnabled?: boolean;

  @ApiPropertyOptional({ description: "Sending Gmail address for outgoing email" })
  @IsOptional()
  @IsEmail()
  gmailUser?: string;

  @ApiPropertyOptional({
    description:
      "Gmail App Password (not the account login password) — generate one at myaccount.google.com/apppasswords",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  gmailAppPassword?: string;

  @ApiPropertyOptional({ description: "Cloudinary cloud name, from the Cloudinary console" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cloudinaryCloudName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cloudinaryApiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cloudinaryApiSecret?: string;

  @ApiPropertyOptional({ description: "Google Web Client ID / backend token audience" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  googleClientId?: string;

  @ApiPropertyOptional({ description: "Google Android Client ID for mobile apps" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  googleAndroidClientId?: string;

  @ApiPropertyOptional({ description: "Google iOS Client ID for mobile apps" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  googleIosClientId?: string;
}
