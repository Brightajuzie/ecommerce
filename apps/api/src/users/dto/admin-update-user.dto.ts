import { ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from "class-validator";

// Role can only be set to BUYER or VENDOR here — never ADMIN/SUPER_ADMIN,
// and the service layer additionally refuses to touch a target account
// that's already ADMIN/SUPER_ADMIN, so this endpoint can't be used to
// edit or promote into privileged accounts either way.
export class AdminUpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: [UserRole.BUYER, UserRole.VENDOR] })
  @IsOptional()
  @IsIn([UserRole.BUYER, UserRole.VENDOR])
  role?: UserRole;

  // Required when switching a BUYER into a VENDOR for the first time (to
  // create their VendorProfile); ignored otherwise.
  @ApiPropertyOptional()
  @ValidateIf((dto: AdminUpdateUserDto) => dto.role === UserRole.VENDOR)
  @IsOptional()
  @IsString()
  @MinLength(2)
  businessName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
