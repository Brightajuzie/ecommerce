import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class GoogleAuthDto {
  @ApiProperty({ description: "Google ID token obtained from the client-side OAuth flow" })
  @IsString()
  idToken: string;
}
