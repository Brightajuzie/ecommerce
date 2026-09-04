import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { PrismaService } from "../prisma/prisma.service";

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

interface ResolvedEmailConfig {
  transporter: nodemailer.Transporter;
  from: string;
}

/**
 * Thin nodemailer wrapper. Credentials resolve fresh on every send() (same
 * override pattern as FlutterwaveService.getSecretKey): the Gmail
 * address/App Password saved via the SUPER_ADMIN-only gateway settings
 * screen (PlatformPaymentSettings.gmailUser/gmailAppPassword) take
 * priority, falling back to generic SMTP_* env vars — set on the hosting
 * platform — when neither is configured through the app. Resolving fresh
 * per send (rather than once at startup) means an admin turning Gmail on
 * takes effect immediately, no redeploy needed.
 *
 * Same fallback-gracefully pattern as CloudinaryService/FlutterwaveService/
 * DojahService: when nothing is configured, send() is a logged no-op
 * instead of throwing, so the rest of the app (order confirmations, etc.)
 * keeps working with no mail credentials set up yet.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveConfig(): Promise<ResolvedEmailConfig | null> {
    const settings = await this.prisma.platformPaymentSettings.findFirst();

    const gmailUser = settings?.gmailUser || "";
    const gmailAppPassword = settings?.gmailAppPassword || "";
    if (gmailUser && gmailAppPassword) {
      return {
        // nodemailer's "service: gmail" shorthand resolves the right
        // host/port/TLS itself — no need to hardcode smtp.gmail.com:465.
        transporter: nodemailer.createTransport({
          service: "gmail",
          auth: { user: gmailUser, pass: gmailAppPassword },
        }),
        from: `Ikaystores <${gmailUser}>`,
      };
    }

    const host = this.configService.get<string>("SMTP_HOST", "");
    if (!host) {
      return null;
    }
    const port = Number(this.configService.get<string>("SMTP_PORT", "587"));
    return {
      transporter: nodemailer.createTransport({
        host,
        port,
        // 465 is the implicit-TLS port; every other port (587, 25, ...)
        // uses STARTTLS instead, which nodemailer negotiates itself when
        // secure is false.
        secure: port === 465,
        auth: {
          user: this.configService.get<string>("SMTP_USER", ""),
          pass: this.configService.get<string>("SMTP_PASS", ""),
        },
      }),
      from:
        this.configService.get<string>("SMTP_FROM", "") ||
        `Ikaystores <no-reply@${host}>`,
    };
  }

  async send(input: SendEmailInput): Promise<void> {
    const config = await this.resolveConfig();
    if (!config) {
      this.logger.log(`[email skipped, no provider configured] to=${input.to} subject="${input.subject}"`);
      return;
    }

    try {
      await config.transporter.sendMail({
        from: config.from,
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
