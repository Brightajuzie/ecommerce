import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUrl } from "class-validator";

export class SetVendorDocumentsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  businessRegistrationDocUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  governmentIdDocUrl?: string;
}
