import { join, basename } from "node:path";
import { existsSync } from "node:fs";
import {
  BadRequestException,
  Body,
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

// Kept in sync with MAX_UPLOAD_BYTES in apps/mobile/src/api/upload.ts,
// which compresses down to fit this before ever sending the request — and
// with the "That file is too large" message in all-exceptions.filter.ts.
const MAX_FILE_SIZE_BYTES = 200 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
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
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    // Optional multipart field, not validated by a DTO/ValidationPipe (this
    // route only ever receives multipart form-data, which Nest doesn't run
    // through the global ValidationPipe the way a JSON body is) — an
    // unrecognized value just falls through to the default (non-product)
    // transformation in UploadsService, so there's no unsafe case here.
    @Body("type") type?: string,
  ) {
    if (!file) {
      throw new BadRequestException("No file was uploaded");
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        "Only JPEG, PNG, or PDF files are allowed",
      );
    }
    return this.uploadsService.uploadImage(file.buffer, file.mimetype, type);
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
