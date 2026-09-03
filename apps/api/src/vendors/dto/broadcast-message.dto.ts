import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class BroadcastMessageDto {
  @ApiProperty()
  @IsString()
  @Length(1, 4000)
  body: string;
}
