import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole, VendorStatus } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { VendorsService } from "./vendors.service";
import { ApplyVendorDto } from "./dto/apply-vendor.dto";
import { SetPayoutAccountDto } from "./dto/set-payout-account.dto";

@ApiTags("vendors")
@Controller("vendors")
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  listApproved() {
    return this.vendorsService.listApproved();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("apply")
  apply(@CurrentUser() user: AuthenticatedUser, @Body() dto: ApplyVendorDto) {
    return this.vendorsService.apply(user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("me")
  getMyVendorProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.vendorsService.getMyVendorProfile(user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch("me/payout-account")
  setPayoutAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetPayoutAccountDto,
  ) {
    return this.vendorsService.setPayoutAccount(user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("banks")
  listBanks() {
    return this.vendorsService.listBanks();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get("pending")
  listPending() {
    return this.vendorsService.listPending();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(":id/approve")
  approve(@Param("id") id: string) {
    return this.vendorsService.setStatus(id, VendorStatus.APPROVED);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(":id/suspend")
  suspend(@Param("id") id: string) {
    return this.vendorsService.setStatus(id, VendorStatus.SUSPENDED);
  }
}
