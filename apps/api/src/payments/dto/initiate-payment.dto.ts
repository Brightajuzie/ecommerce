import { ApiProperty } from "@nestjs/swagger";
import { PaymentProvider } from "@prisma/client";
import { IsEnum, IsUUID } from "class-validator";

export class InitiatePaymentDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;
}
