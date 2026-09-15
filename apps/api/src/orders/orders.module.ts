import { Module } from "@nestjs/common";
import { PaymentSettingsModule } from "../payment-settings/payment-settings.module";
import { WalletsModule } from "../wallets/wallets.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrdersExportService } from "./orders-export.service";

@Module({
  imports: [PaymentSettingsModule, WalletsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersExportService],
  exports: [OrdersService],
})
export class OrdersModule {}
