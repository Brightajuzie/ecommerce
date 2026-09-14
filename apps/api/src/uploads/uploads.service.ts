import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";
import { PrismaService } from "../prisma/prisma.service";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

export const LOCAL_UPLOAD_DIR = join(process.cwd(), "uploads");

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // DB value (set via the SUPER_ADMIN-only gateway settings screen) takes
  // priority over the env var, resolved fresh on every call rather than
  // cached once — same override pattern as FlutterwaveService.getSecretKey,
  // so an admin turning Cloudinary on/off from the app takes effect
  // immediately, no redeploy needed. cloudinary.config() itself is cheap
  // (just sets a module-level object), so re-calling it per upload is fine.
  private async isCloudinaryConfigured(): Promise<boolean> {
    const settings = await this.prisma.platformPaymentSettings.findFirst();

    const cloudName =
      settings?.cloudinaryCloudName || this.configService.get<string>("CLOUDINARY_CLOUD_NAME", "");
    const apiKey =
      settings?.cloudinaryApiKey || this.configService.get<string>("CLOUDINARY_API_KEY", "");
    const apiSecret =
      settings?.cloudinaryApiSecret || this.configService.get<string>("CLOUDINARY_API_SECRET", "");

    if (!cloudName || !apiKey || !apiSecret) {
      return false;
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    return true;
  }

  async uploadImage(buffer: Buffer, mimetype: string): Promise<{ url: string }> {
    if (await this.isCloudinaryConfigured()) {
      return this.uploadToCloudinary(buffer, mimetype);
    }

    // Local-disk fallback is dev-only. Most hosts (this app runs on Render)
    // give the app an EPHEMERAL filesystem — anything saved here is wiped on
    // the next deploy, so a vendor's product photo would "succeed" today and
    // 404 for every buyer after the next release. In production, fail loudly
    // instead: same BadGatewayException pattern as Dojah/Flutterwave/Opay
    // when their credentials are missing, so a broken upload is visible
    // immediately rather than silently corrupting data later.
    if (this.configService.get<string>("NODE_ENV") === "production") {
      this.logger.error(
        "Image upload attempted with no Cloudinary credentials configured in production",
      );
      throw new BadGatewayException("Image upload is not configured on this server");
    }

    // No Cloudinary credentials configured (common in local/dev environments) —
    // fall back to serving the file straight off this server's own disk
    // rather than leaving uploads (and anything that depends on them, like
    // vendor product creation) completely broken.
    return this.saveLocally(buffer, mimetype);
  }

  private uploadToCloudinary(buffer: Buffer, mimetype: string): Promise<{ url: string }> {
    // A PDF (business registration certs, government IDs sometimes come as
    // one) isn't a photo — the improve/sharpen/quality effects below are
    // meaningless for it, and resource_type "image" would try to rasterize
    // just its first page. "raw" stores it byte-for-byte instead.
    const isPdf = mimetype === "application/pdf";
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "ikaystores",
          resource_type: isPdf ? "raw" : "image",
          ...(!isPdf && {
            transformation: [
              { effect: "improve" },
              // Product/document photos are usually phone-camera shots viewed
              // at a fraction of their native size — a mild sharpen keeps
              // edges/text crisp after that downscale instead of looking soft.
              { effect: "sharpen" },
              { quality: "auto:best", fetch_format: "auto" },
              { width: 2000, height: 2000, crop: "limit" },
            ],
          }),
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error("Cloudinary upload failed", error);
            reject(new BadGatewayException("Image upload failed"));
            return;
          }
          resolve({ url: result.secure_url });
        },
      );
      uploadStream.end(buffer);
    });
  }

  private async saveLocally(buffer: Buffer, mimetype: string): Promise<{ url: string }> {
    const ext = MIME_EXTENSIONS[mimetype] ?? "jpg";
    const filename = `${randomUUID()}.${ext}`;

    await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
    await writeFile(join(LOCAL_UPLOAD_DIR, filename), buffer);

    const appUrl = this.configService.get<string>("APP_URL", "http://localhost:3001");
    return { url: `${appUrl}/api/v1/uploads/local/${filename}` };
  }
}
