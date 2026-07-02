import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { CartService } from "./cart.service";
import { AddCartItemDto } from "./dto/add-cart-item.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";

@ApiTags("cart")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("cart")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: AuthenticatedUser) {
    return this.cartService.getCart(user.userId);
  }

  @Post("items")
  addItem(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user.userId, dto);
  }

  @Patch("items/:id")
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.userId, id, dto);
  }

  @Delete("items/:id")
  removeItem(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.cartService.removeItem(user.userId, id);
  }
}
