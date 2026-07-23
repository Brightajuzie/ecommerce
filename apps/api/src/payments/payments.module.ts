import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { FlutterwaveService } from "./flutterwave/flutterwave.service";
import { OpayService } from "./opay/opay.service";

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, FlutterwaveService, OpayService],
  exports: [FlutterwaveService],
})
export class PaymentsModule {}
