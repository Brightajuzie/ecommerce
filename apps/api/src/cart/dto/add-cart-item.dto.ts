import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsUUID, Max, Min } from "class-validator";

export class AddCartItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(999)
  quantity: number;
}
