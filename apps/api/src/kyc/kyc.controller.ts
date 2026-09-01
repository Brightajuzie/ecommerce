import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { KycService } from "./kyc.service";
import { VerifyIdNumberDto } from "./dto/verify-id-number.dto";
import { CheckLivenessDto } from "./dto/check-liveness.dto";

@ApiTags("kyc")
@Controller("kyc")
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("verify-id-number")
  verifyIdNumber(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyIdNumberDto,
  ) {
    return this.kycService.verifyIdNumber(user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("check-liveness")
  checkLiveness(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckLivenessDto,
  ) {
    return this.kycService.checkLiveness(user.userId, dto);
  }
}
