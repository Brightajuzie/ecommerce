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
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { OrdersService } from "./orders.service";
import { CheckoutDto } from "./dto/checkout.dto";
import { UpdateVendorOrderStatusDto } from "./dto/update-vendor-order-status.dto";

@ApiTags("orders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("checkout")
  checkout(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(user.userId, dto);
  }

  @Get()
  findMyOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findMyOrders(user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get("vendor")
  findVendorOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findVendorOrders(user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @Patch("vendor/:vendorOrderId/status")
  updateVendorOrderStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorOrderId") vendorOrderId: string,
    @Body() dto: UpdateVendorOrderStatusDto,
  ) {
    return this.ordersService.updateVendorOrderStatus(
      user.userId,
      vendorOrderId,
      dto,
    );
  }

  @Get(":id")
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.ordersService.findMyOrderById(user.userId, id);
  }
}
