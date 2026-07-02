import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Max, Min } from "class-validator";

export class UpdateCartItemDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(999)
  quantity: number;
}
