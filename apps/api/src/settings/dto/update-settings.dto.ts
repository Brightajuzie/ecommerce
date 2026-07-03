import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUrl, Matches } from "class-validator";

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: "#111827" })
  @IsOptional()
  @Matches(HEX_COLOR, {
    message: "primaryColor must be a hex color like #111827",
  })
  primaryColor?: string;

  @ApiPropertyOptional({ example: "#4B5563" })
  @IsOptional()
  @Matches(HEX_COLOR, {
    message: "secondaryColor must be a hex color like #4B5563",
  })
  secondaryColor?: string;

  @ApiPropertyOptional({ example: "#F59E0B" })
  @IsOptional()
  @Matches(HEX_COLOR, {
    message: "accentColor must be a hex color like #F59E0B",
  })
  accentColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}
