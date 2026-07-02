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

export class RegisterDto {
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
  @ValidateIf((dto: RegisterDto) => dto.role === UserRole.VENDOR)
  @IsString()
  @MinLength(2)
  businessName?: string;
}
