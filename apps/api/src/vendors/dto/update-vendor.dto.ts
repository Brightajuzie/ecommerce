import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

// Admin-only edit (PATCH /vendors/:id) — distinct from ApplyVendorDto, which
// is what a vendor submits about themselves. Only the fields an admin
// should reasonably override are here; identity/liveness status and
// documents stay managed through their own flows.
export class UpdateVendorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  businessName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Percent, e.g. 10 for 10%" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;
}
