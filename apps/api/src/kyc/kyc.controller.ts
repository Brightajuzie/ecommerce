import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { KycService } from "./kyc.service";
import type { SmileIdWebhookBody } from "./kyc.service";
import { SubmitKycDto } from "./dto/submit-kyc.dto";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

@ApiTags("kyc")
@Controller("kyc")
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @ApiBearerAuth()
  @ApiConsumes("multipart/form-data")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Post("verify")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: MAX_FILE_SIZE_BYTES } }),
  )
  async verify(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitKycDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("No selfie image was uploaded");
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        "Only JPEG, PNG, and WEBP images are allowed",
      );
    }
    return this.kycService.submit(user.userId, dto, file.buffer);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get("status")
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.kycService.getStatus(user.userId);
  }

  @Post("webhook")
  webhook(
    @Body() body: SmileIdWebhookBody,
    @Headers("timestamp") headerTimestamp: string | undefined,
    @Headers("signature") headerSignature: string | undefined,
  ) {
    const timestamp = headerTimestamp ?? body.timestamp ?? "";
    const signature = headerSignature ?? body.signature ?? "";
    return this.kycService.handleWebhook(body, timestamp, signature);
  }
}
