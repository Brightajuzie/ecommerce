import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { UserRole } from "@prisma/client";

export class AdminListUsersQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: [UserRole.BUYER, UserRole.VENDOR] })
  @IsOptional()
  @IsIn([UserRole.BUYER, UserRole.VENDOR])
  role?: UserRole;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
