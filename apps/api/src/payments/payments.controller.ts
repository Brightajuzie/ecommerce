import { Body, Controller, Get, Headers, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { PaymentsService } from "./payments.service";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("initiate")
  initiate(@CurrentUser() user: AuthenticatedUser, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiate(user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("verify/:reference")
  verify(@CurrentUser() user: AuthenticatedUser, @Param("reference") reference: string) {
    return this.paymentsService.verifyByReference(user.userId, reference);
  }

  @Post("webhook/flutterwave")
  handleFlutterwaveWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers("verif-hash") legacyHash: string | undefined,
    @Headers("flutterwave-signature") signature: string | undefined,
    @Body() body: unknown,
  ) {
    return this.paymentsService.handleFlutterwaveWebhook(
      req.rawBody ?? Buffer.from(JSON.stringify(body)),
      signature ?? legacyHash,
      body,
    );
  }

  @Post("webhook/opay")
  handleOpayWebhook(@Body() body: any) {
    return this.paymentsService.handleOpayWebhook(body);
  }

  /**
   * Browser-redirect landing page after the hosted checkout completes. The
   * mobile app's WebView intercepts navigation to this URL before it fully
   * loads; this page is a plain-HTML fallback for anyone who lands on it
   * directly. The webhook (not this page) is the source of truth for status.
   */
  @Get("redirect/:provider")
  redirectLanding(@Res() res: Response, @Param("provider") provider: string) {
    res
      .status(200)
      .type("html")
      .send(
        `<!doctype html><html><body style="font-family: sans-serif; text-align: center; padding-top: 3rem;">` +
          `<h2>Payment ${provider} received</h2>` +
          `<p>You can close this window and return to the app.</p>` +
          `</body></html>`,
      );
  }
}
