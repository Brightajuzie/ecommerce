import { Module } from "@nestjs/common";
import { KycController } from "./kyc.controller";
import { KycService } from "./kyc.service";
import { DojahService } from "./dojah/dojah.service";

@Module({
  controllers: [KycController],
  providers: [KycService, DojahService],
})
export class KycModule {}
