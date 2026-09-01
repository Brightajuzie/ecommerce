import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class CheckLivenessDto {
  @ApiProperty({ description: "Base64-encoded selfie image (JPEG/PNG), no data-URI prefix" })
  @IsString()
  @Length(100, 8_000_000)
  imageBase64: string;
}
