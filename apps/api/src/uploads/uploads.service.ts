import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private configured = false;

  constructor(private readonly configService: ConfigService) {}

  private ensureConfigured() {
    if (this.configured) return;

    const cloudName = this.configService.get<string>(
      "CLOUDINARY_CLOUD_NAME",
      "",
    );
    const apiKey = this.configService.get<string>("CLOUDINARY_API_KEY", "");
    const apiSecret = this.configService.get<string>(
      "CLOUDINARY_API_SECRET",
      "",
    );

    if (!cloudName || !apiKey || !apiSecret) {
      throw new BadGatewayException(
        "Image uploads are not configured on this server",
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    this.configured = true;
  }

  async uploadImage(buffer: Buffer): Promise<{ url: string }> {
    this.ensureConfigured();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "ikaystores",
          resource_type: "image",
          transformation: [
            { effect: "improve" },
            { quality: "auto:best", fetch_format: "auto" },
            { width: 2000, height: 2000, crop: "limit" },
          ],
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
}
