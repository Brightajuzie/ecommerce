import * as crypto from "crypto";
import type { ConfigService } from "@nestjs/config";
import { FlutterwaveService } from "./flutterwave.service";

describe("FlutterwaveService.verifyWebhookSignature", () => {
  const webhookSecret = "test-webhook-secret";

  const makeService = () => {
    const configService: Pick<ConfigService, "get"> = {
      get: jest.fn((key: string) =>
        key === "FLW_WEBHOOK_HASH" ? webhookSecret : "",
      ) as ConfigService["get"],
    };
    return new FlutterwaveService(configService as ConfigService);
  };

  it("accepts a correctly signed raw body", () => {
    const service = makeService();
    const rawBody = JSON.stringify({
      event: "charge.completed",
      data: { tx_ref: "abc" },
    });
    const signature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("base64");

    expect(service.verifyWebhookSignature(rawBody, signature)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const service = makeService();
    const rawBody = JSON.stringify({
      event: "charge.completed",
      data: { tx_ref: "abc" },
    });
    const signature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("base64");
    const tamperedBody = JSON.stringify({
      event: "charge.completed",
      data: { tx_ref: "xyz" },
    });

    expect(service.verifyWebhookSignature(tamperedBody, signature)).toBe(false);
  });

  it("rejects when no signature header is present", () => {
    const service = makeService();
    expect(service.verifyWebhookSignature("{}", undefined)).toBe(false);
  });
});
