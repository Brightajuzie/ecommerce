import { Module } from "@nestjs/common";
import { PaymentsModule } from "../payments/payments.module";
import { EmailModule } from "../email/email.module";
import { PaymentSettingsController } from "./payment-settings.controller";
import { PaymentSettingsService } from "./payment-settings.service";

@Module({
  imports: [PaymentsModule, EmailModule],
  controllers: [PaymentSettingsController],
  providers: [PaymentSettingsService],
  exports: [PaymentSettingsService],
})
export class PaymentSettingsModule {}
