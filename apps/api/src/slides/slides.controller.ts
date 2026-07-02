import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { SlidesService } from "./slides.service";
import { CreateSlideDto } from "./dto/create-slide.dto";
import { UpdateSlideDto } from "./dto/update-slide.dto";
import { ReorderSlidesDto } from "./dto/reorder-slides.dto";

@ApiTags("slides")
@Controller("slides")
export class SlidesController {
  constructor(private readonly slidesService: SlidesService) {}

  @Get()
  listActive() {
    return this.slidesService.listActive();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get("all")
  listAll() {
    return this.slidesService.listAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateSlideDto) {
    return this.slidesService.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch("reorder")
  reorder(@Body() dto: ReorderSlidesDto) {
    return this.slidesService.reorder(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateSlideDto) {
    return this.slidesService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.slidesService.remove(id);
  }
}
