import { Module } from "@nestjs/common";
import { PaymentsModule } from "../payments/payments.module";
import { VendorsController } from "./vendors.controller";
import { VendorsService } from "./vendors.service";
import { VendorComplianceService } from "./vendor-compliance.service";

@Module({
  imports: [PaymentsModule],
  controllers: [VendorsController],
  providers: [VendorsService, VendorComplianceService],
  exports: [VendorsService],
})
export class VendorsModule {}
