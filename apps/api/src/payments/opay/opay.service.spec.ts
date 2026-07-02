import * as crypto from "crypto";
import { OpayService, OpayCallbackPayload } from "./opay.service";

describe("OpayService.verifyCallbackSignature", () => {
  const secretKey = "test-opay-secret";

  const makeService = () => {
    const configService = {
      get: jest.fn((key: string) => (key === "OPAY_SECRET_KEY" ? secretKey : "")),
    } as any;
    return new OpayService(configService);
  };

  const payload: OpayCallbackPayload = {
    amount: "49160",
    currency: "NGN",
    reference: "10023",
    refunded: false,
    status: "SUCCESS",
    timestamp: "2022-05-07T06:20:46Z",
    token: "220507145660712931829",
    transactionId: "220507145660712931829",
  };

  function computeSignature(p: OpayCallbackPayload) {
    const template =
      `{Amount:"${p.amount}",Currency:"${p.currency}",` +
      `Reference:"${p.reference}",Refunded:${p.refunded ? "t" : "f"},` +
      `Status:"${p.status}",Timestamp:"${p.timestamp}",` +
      `Token:"${p.token}",TransactionID:"${p.transactionId}"}`;
    return crypto.createHmac("sha3-512", secretKey).update(template).digest("hex");
  }

  it("accepts a correctly signed callback payload", () => {
    const service = makeService();
    const sha512 = computeSignature(payload);
    expect(service.verifyCallbackSignature(payload, sha512)).toBe(true);
  });

  it("rejects a tampered amount", () => {
    const service = makeService();
    const sha512 = computeSignature(payload);
    const tampered = { ...payload, amount: "1" };
    expect(service.verifyCallbackSignature(tampered, sha512)).toBe(false);
  });

  it("rejects when no signature is present", () => {
    const service = makeService();
    expect(service.verifyCallbackSignature(payload, undefined)).toBe(false);
  });
});
