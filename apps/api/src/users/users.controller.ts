import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { UsersService } from "./users.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { AddressDto } from "./dto/address.dto";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.userId);
  }

  @Patch("me")
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Get("me/addresses")
  listAddresses(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listAddresses(user.userId);
  }

  @Post("me/addresses")
  createAddress(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddressDto) {
    return this.usersService.createAddress(user.userId, dto);
  }

  @Patch("me/addresses/:id")
  updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: Partial<AddressDto>,
  ) {
    return this.usersService.updateAddress(user.userId, id, dto);
  }

  @Delete("me/addresses/:id")
  deleteAddress(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.usersService.deleteAddress(user.userId, id);
  }
}
