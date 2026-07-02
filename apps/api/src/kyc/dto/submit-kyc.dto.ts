import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { kycIdTypes } from "@ikstore/shared";
import { IsIn, IsOptional, IsString, Length } from "class-validator";

export class SubmitKycDto {
  @ApiProperty({ enum: kycIdTypes })
  @IsIn(kycIdTypes)
  idType: (typeof kycIdTypes)[number];

  @ApiProperty()
  @IsString()
  @Length(4, 30)
  idNumber: string;

  @ApiPropertyOptional({ default: "NG" })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;
}
