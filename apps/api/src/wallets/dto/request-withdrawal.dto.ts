import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsPositive } from "class-validator";

export class RequestWithdrawalDto {
  @ApiProperty({ example: 5000 })
  @IsNumber()
  @IsPositive()
  amount: number;
}
