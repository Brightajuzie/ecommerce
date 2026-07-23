import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { WalletsService } from "./wallets.service";
import type { FlutterwaveTransferWebhookPayload } from "./wallets.service";
import { RequestWithdrawalDto } from "./dto/request-withdrawal.dto";
import { RejectWithdrawalDto } from "./dto/reject-withdrawal.dto";

@ApiTags("wallets")
@Controller("wallets")
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("me")
  getMyWallet(@CurrentUser() user: AuthenticatedUser) {
    return this.walletsService.getMyWallet(user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("withdraw")
  requestWithdrawal(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestWithdrawalDto,
  ) {
    return this.walletsService.requestWithdrawal(user.userId, dto.amount);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("withdrawals")
  listMyWithdrawals(@CurrentUser() user: AuthenticatedUser) {
    return this.walletsService.listMyWithdrawals(user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get("withdrawals/pending")
  listPendingWithdrawals() {
    return this.walletsService.listPendingWithdrawals();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch("withdrawals/:id/approve")
  approveWithdrawal(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.walletsService.approveWithdrawal(id, user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch("withdrawals/:id/reject")
  rejectWithdrawal(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: RejectWithdrawalDto,
  ) {
    return this.walletsService.rejectWithdrawal(id, user.userId, dto.reason);
  }

  // Only SUPER_ADMIN — never ADMIN — can see or withdraw from the platform
  // wallet. See UserRole.SUPER_ADMIN.
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get("platform")
  getPlatformWallet() {
    return this.walletsService.getPlatformWallet();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post("platform/withdraw")
  withdrawFromPlatformWallet(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestWithdrawalDto,
  ) {
    return this.walletsService.withdrawFromPlatformWallet(user.userId, dto.amount);
  }

  @Post("webhook/flutterwave-transfer")
  handleTransferWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers("verif-hash") legacyHash: string | undefined,
    @Headers("flutterwave-signature") signature: string | undefined,
    @Body() body: FlutterwaveTransferWebhookPayload,
  ) {
    return this.walletsService.handleTransferWebhook(
      req.rawBody ?? Buffer.from(JSON.stringify(body)),
      signature ?? legacyHash,
      body,
    );
  }
}
