import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Thin nodemailer wrapper, configured via SMTP_* env vars — same
 * fallback-gracefully pattern as CloudinaryService/FlutterwaveService/
 * DojahService: when SMTP_HOST isn't set, every send() is a logged no-op
 * instead of throwing, so the rest of the app (order confirmation, etc.)
 * keeps working in an environment with no mail credentials configured yet.
 * Unlike those, there's no admin-settable override in PlatformPaymentSettings
 * (SMTP credentials aren't the kind of thing to paste into the app) — env
 * vars only, set on the hosting platform.
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromAddress = "";

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>("SMTP_HOST", "");
    if (!host) {
      this.logger.warn(
        "SMTP_HOST is not configured — outgoing emails will be logged, not sent.",
      );
      return;
    }

    const port = Number(this.configService.get<string>("SMTP_PORT", "587"));
    this.transporter = nodemailer.createTransport({
      host,
      port,
      // 465 is the implicit-TLS port; every other port (587, 25, ...) uses
      // STARTTLS instead, which nodemailer negotiates itself when secure is
      // false — this isn't an optional/insecure fallback, it's the correct
      // flag for the non-465 case.
      secure: port === 465,
      auth: {
        user: this.configService.get<string>("SMTP_USER", ""),
        pass: this.configService.get<string>("SMTP_PASS", ""),
      },
    });
    this.fromAddress =
      this.configService.get<string>("SMTP_FROM", "") ||
      `Ikaystores <no-reply@${host}>`;
  }

  async send(input: SendEmailInput): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[email skipped, SMTP not configured] to=${input.to} subject="${input.subject}"`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
    } catch (error) {
      // Best-effort: a failed email should never fail the order/payment
      // flow it's attached to — every caller treats this as fire-and-forget.
      this.logger.error(`Failed to send email to ${input.to}`, error);
    }
  }
}
