import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { OrdersService } from "./orders.service";
import { OrdersExportService } from "./orders-export.service";
import { CheckoutDto } from "./dto/checkout.dto";
import { UpdateVendorOrderStatusDto } from "./dto/update-vendor-order-status.dto";
import { AdminOrdersQueryDto } from "./dto/admin-orders-query.dto";

@ApiTags("orders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("orders")
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly ordersExportService: OrdersExportService,
  ) {}

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

  // Every order platform-wide, any buyer — the "Transactions" admin screen.
  // Declared ahead of the :id route below so "admin"/"admin/export" aren't
  // swallowed by it as a literal order id.
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get("admin")
  findAllForAdmin(@Query() query: AdminOrdersQueryDto) {
    return this.ordersService.findAllForAdmin(query);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get("admin/export")
  async exportForAdmin(@Query() query: AdminOrdersQueryDto, @Res() res: Response) {
    const orders = await this.ordersService.findAllForAdminExport(query);
    const date = new Date().toISOString().slice(0, 10);

    if (query.format === "pdf") {
      const buffer = await this.ordersExportService.toPdf(orders);
      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ikaystores-orders-${date}.pdf"`,
      });
      res.send(buffer);
      return;
    }

    const buffer = await this.ordersExportService.toExcel(orders);
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ikaystores-orders-${date}.xlsx"`,
    });
    res.send(buffer);
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
