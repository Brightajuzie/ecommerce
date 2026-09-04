import { Module } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { FlutterwaveService } from "./flutterwave/flutterwave.service";
import { OpayService } from "./opay/opay.service";

@Module({
  imports: [NotificationsModule, EmailModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, FlutterwaveService, OpayService],
  exports: [FlutterwaveService],
})
export class PaymentsModule {}
