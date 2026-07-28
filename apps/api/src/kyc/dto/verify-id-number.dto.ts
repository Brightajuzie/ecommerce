import { ApiProperty } from "@nestjs/swagger";
import { identityVerificationTypes } from "@ikaystores/shared";
import { IsIn, Matches } from "class-validator";

export class VerifyIdNumberDto {
  @ApiProperty({ enum: identityVerificationTypes })
  @IsIn(identityVerificationTypes)
  idType: (typeof identityVerificationTypes)[number];

  @ApiProperty()
  @Matches(/^\d{11}$/, { message: "idNumber must be exactly 11 digits" })
  idNumber: string;
}
