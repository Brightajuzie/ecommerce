import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { SetVendorDocumentsDto } from "./dto/set-vendor-documents.dto";
import { UpdateVendorDto } from "./dto/update-vendor.dto";
import { SendVendorMessageDto } from "./dto/send-vendor-message.dto";
import { BroadcastMessageDto } from "./dto/broadcast-message.dto";

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
  @Patch("me/documents")
  setDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetVendorDocumentsDto,
  ) {
    return this.vendorsService.setDocuments(user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("banks")
  listBanks() {
    return this.vendorsService.listBanks();
  }

  // Vendor's own side of their support/announcements thread with the admin
  // team — declared alongside the other "me/*" routes (before any ":id"
  // route) so Nest never tries to match the literal "me" segment as an :id.
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("me/messages")
  async getMyMessages(@CurrentUser() user: AuthenticatedUser) {
    const vendor = await this.vendorsService.getMyVendorProfile(user.userId);
    return this.vendorsService.listMessages(vendor.id, "vendor");
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("me/messages")
  sendMyMessage(@CurrentUser() user: AuthenticatedUser, @Body() dto: SendVendorMessageDto) {
    return this.vendorsService.sendMyMessage(user.userId, dto.body);
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
  @Get("all")
  listAll() {
    return this.vendorsService.listAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post("broadcast")
  broadcast(@CurrentUser() user: AuthenticatedUser, @Body() dto: BroadcastMessageDto) {
    return this.vendorsService.broadcast(user.userId, dto.body);
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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get(":id/messages")
  getMessages(@Param("id") id: string) {
    return this.vendorsService.listMessages(id, "admin");
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(":id/messages")
  sendMessageToVendor(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendVendorMessageDto,
  ) {
    return this.vendorsService.sendMessage(id, user.userId, dto.body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateVendorDto) {
    return this.vendorsService.updateVendor(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(204)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.vendorsService.deleteVendor(id);
  }
}
