import { join, basename } from "node:path";
import { existsSync } from "node:fs";
import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UploadsService, LOCAL_UPLOAD_DIR } from "./uploads.service";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

@ApiTags("uploads")
@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @ApiBearerAuth()
  @ApiConsumes("multipart/form-data")
  @UseGuards(JwtAuthGuard)
  @Post("image")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No file was uploaded");
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        "Only JPEG, PNG, WEBP, and GIF images are allowed",
      );
    }
    return this.uploadsService.uploadImage(file.buffer, file.mimetype);
  }

  // Public (no auth) — serves the local-disk fallback used when Cloudinary
  // isn't configured. These are product/slide/logo photos, same visibility
  // as a Cloudinary URL would have. `basename()` strips any path segments
  // so the `filename` param can't be used to escape LOCAL_UPLOAD_DIR.
  @Get("local/:filename")
  serveLocal(@Param("filename") filename: string, @Res() res: Response) {
    const safeName = basename(filename);
    const filePath = join(LOCAL_UPLOAD_DIR, safeName);
    if (!existsSync(filePath)) {
      throw new NotFoundException("File not found");
    }
    // Overrides helmet's default same-origin CORP so the mobile web app
    // (a different origin/port in dev) can actually render these images.
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.sendFile(filePath);
  }
}
