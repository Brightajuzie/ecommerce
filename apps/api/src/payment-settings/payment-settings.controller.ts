import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { PaymentSettingsService } from "./payment-settings.service";
import { UpdatePaymentSettingsDto } from "./dto/update-payment-settings.dto";
import { SetPayoutAccountDto } from "./dto/set-payout-account.dto";
import { UpdateGatewaySettingsDto } from "./dto/update-gateway-settings.dto";

// The revenue-split settings (and the payout account they're paid through)
// are visible/editable by both ADMIN and SUPER_ADMIN — only the platform
// wallet itself (balance, transactions, withdrawing from it — see
// WalletsController) is SUPER_ADMIN-exclusive.
@ApiTags("payment-settings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller("payment-settings")
export class PaymentSettingsController {
  constructor(private readonly paymentSettingsService: PaymentSettingsService) {}

  @Get()
  get() {
    return this.paymentSettingsService.get();
  }

  @Patch()
  update(@Body() dto: UpdatePaymentSettingsDto) {
    return this.paymentSettingsService.update(dto);
  }

  @Patch("payout-account")
  setPayoutAccount(@Body() dto: SetPayoutAccountDto) {
    return this.paymentSettingsService.setPayoutAccount(dto);
  }

  // Gateway credentials (Flutterwave/Opay API keys) and the support email
  // are SUPER_ADMIN-only, unlike the routes above — whoever holds live
  // payment credentials can redirect real money, so this is deliberately
  // narrower than the ADMIN+SUPER_ADMIN revenue-split settings.
  @Roles(UserRole.SUPER_ADMIN)
  @Get("gateway")
  getGateway() {
    return this.paymentSettingsService.getGatewaySettings();
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Patch("gateway")
  updateGateway(@Body() dto: UpdateGatewaySettingsDto) {
    return this.paymentSettingsService.updateGatewaySettings(dto);
  }
}
