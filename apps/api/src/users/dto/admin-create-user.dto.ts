import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from "class-validator";

// Admin-created accounts are restricted to BUYER/VENDOR — creating another
// ADMIN or SUPER_ADMIN account isn't something this endpoint allows.
export class AdminCreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: [UserRole.BUYER, UserRole.VENDOR] })
  @IsOptional()
  @IsIn([UserRole.BUYER, UserRole.VENDOR])
  role?: UserRole;

  @ApiPropertyOptional()
  @ValidateIf((dto: AdminCreateUserDto) => dto.role === UserRole.VENDOR)
  @IsString()
  @MinLength(2)
  businessName?: string;
}
