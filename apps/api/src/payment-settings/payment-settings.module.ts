import { Module } from "@nestjs/common";
import { PaymentsModule } from "../payments/payments.module";
import { PaymentSettingsController } from "./payment-settings.controller";
import { PaymentSettingsService } from "./payment-settings.service";

@Module({
  imports: [PaymentsModule],
  controllers: [PaymentSettingsController],
  providers: [PaymentSettingsService],
  exports: [PaymentSettingsService],
})
export class PaymentSettingsModule {}
