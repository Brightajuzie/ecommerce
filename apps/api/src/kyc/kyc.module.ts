import { Module } from "@nestjs/common";
import { KycController } from "./kyc.controller";
import { KycService } from "./kyc.service";
import { SmileIdService } from "./smile-id/smile-id.service";

@Module({
  controllers: [KycController],
  providers: [KycService, SmileIdService],
})
export class KycModule {}
