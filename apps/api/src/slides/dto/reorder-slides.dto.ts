import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsUUID } from "class-validator";

export class ReorderSlidesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  orderedIds: string[];
}
