import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class RejectWithdrawalDto {
  @ApiPropertyOptional({ example: "Bank details could not be verified" })
  @IsOptional()
  @IsString()
  reason?: string;
}
