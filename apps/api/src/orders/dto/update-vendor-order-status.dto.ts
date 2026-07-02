import { ApiProperty } from "@nestjs/swagger";
import { VendorOrderStatus } from "@prisma/client";
import { IsIn } from "class-validator";

export class UpdateVendorOrderStatusDto {
  @ApiProperty({
    enum: [
      VendorOrderStatus.ACCEPTED,
      VendorOrderStatus.SHIPPED,
      VendorOrderStatus.DELIVERED,
      VendorOrderStatus.CANCELLED,
    ],
  })
  @IsIn([
    VendorOrderStatus.ACCEPTED,
    VendorOrderStatus.SHIPPED,
    VendorOrderStatus.DELIVERED,
    VendorOrderStatus.CANCELLED,
  ])
  status:
    | typeof VendorOrderStatus.ACCEPTED
    | typeof VendorOrderStatus.SHIPPED
    | typeof VendorOrderStatus.DELIVERED
    | typeof VendorOrderStatus.CANCELLED;
}
