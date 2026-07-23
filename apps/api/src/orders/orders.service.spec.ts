import { BadRequestException } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { PaymentSettingsService } from "../payment-settings/payment-settings.service";
import type { WalletsService } from "../wallets/wallets.service";

interface VendorOrderCreateData {
  vendorId: string;
  subtotal: number;
  commissionAmount: number;
  vendorPayoutAmount: number;
  companyAmount: number;
  developerAmount: number;
  superAdminAmount: number;
}

interface MockPrisma {
  address: { findUnique: jest.Mock };
  cart: { findUnique: jest.Mock };
  order: { create: jest.Mock; findUniqueOrThrow: jest.Mock };
  vendorOrder: { create: jest.Mock };
  product: { update: jest.Mock };
  cartItem: { deleteMany: jest.Mock };
  $transaction: jest.Mock;
}

// Matches PlatformPaymentSettings' schema defaults so the math below lines
// up with production behavior without needing to special-case the test.
const DEFAULT_PAYMENT_SETTINGS = {
  companySharePercent: 70,
  developerSharePercent: 30,
  superAdminFeePercent: 0.1,
};

describe("OrdersService.checkout", () => {
  let service: OrdersService;
  let prisma: MockPrisma;
  let paymentSettingsService: { get: jest.Mock };
  let walletsService: WalletsService;

  beforeEach(() => {
    prisma = {
      address: { findUnique: jest.fn() },
      cart: { findUnique: jest.fn() },
      order: { create: jest.fn(), findUniqueOrThrow: jest.fn() },
      vendorOrder: { create: jest.fn() },
      product: { update: jest.fn() },
      cartItem: { deleteMany: jest.fn() },
      $transaction: jest.fn(),
    };
    paymentSettingsService = {
      get: jest.fn().mockResolvedValue(DEFAULT_PAYMENT_SETTINGS),
    };
    walletsService = {} as WalletsService;
    service = new OrdersService(
      prisma as unknown as PrismaService,
      paymentSettingsService as unknown as PaymentSettingsService,
      walletsService,
    );
  });

  it("throws when the address does not belong to the buyer", async () => {
    prisma.address.findUnique.mockResolvedValue({
      id: "addr-1",
      userId: "someone-else",
    });

    await expect(
      service.checkout("buyer-1", { addressId: "addr-1" }),
    ).rejects.toThrow();
  });

  it("throws when the cart is empty", async () => {
    prisma.address.findUnique.mockResolvedValue({
      id: "addr-1",
      userId: "buyer-1",
    });
    prisma.cart.findUnique.mockResolvedValue({ id: "cart-1", items: [] });

    await expect(
      service.checkout("buyer-1", { addressId: "addr-1" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws when requested quantity exceeds stock", async () => {
    prisma.address.findUnique.mockResolvedValue({
      id: "addr-1",
      userId: "buyer-1",
    });
    prisma.cart.findUnique.mockResolvedValue({
      id: "cart-1",
      items: [
        {
          productId: "p1",
          quantity: 5,
          priceAtAdd: 1000,
          product: {
            id: "p1",
            title: "Widget",
            stock: 2,
            vendorId: "v1",
            currency: "NGN",
            vendor: { commissionRate: 10 },
          },
        },
      ],
    });

    await expect(
      service.checkout("buyer-1", { addressId: "addr-1" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("splits a multi-vendor cart into one VendorOrder per vendor with correct commission math", async () => {
    prisma.address.findUnique.mockResolvedValue({
      id: "addr-1",
      userId: "buyer-1",
    });
    prisma.cart.findUnique.mockResolvedValue({
      id: "cart-1",
      items: [
        {
          productId: "p1",
          quantity: 2,
          priceAtAdd: 1000,
          product: {
            id: "p1",
            title: "Widget A",
            stock: 10,
            vendorId: "vendor-A",
            currency: "NGN",
            vendor: { commissionRate: 10 },
          },
        },
        {
          productId: "p2",
          quantity: 1,
          priceAtAdd: 5000,
          product: {
            id: "p2",
            title: "Widget B",
            stock: 10,
            vendorId: "vendor-B",
            currency: "NGN",
            vendor: { commissionRate: 20 },
          },
        },
      ],
    });

    const createdVendorOrders: VendorOrderCreateData[] = [];
    prisma.vendorOrder.create.mockImplementation(
      ({ data }: { data: VendorOrderCreateData }) => {
        createdVendorOrders.push(data);
        return Promise.resolve(data);
      },
    );
    prisma.order.create.mockResolvedValue({ id: "order-1" });
    prisma.order.findUniqueOrThrow.mockResolvedValue({
      id: "order-1",
      vendorOrders: createdVendorOrders,
    });

    prisma.$transaction.mockImplementation(
      async (cb: (tx: MockPrisma) => Promise<unknown>) => cb(prisma),
    );

    const result = await service.checkout("buyer-1", { addressId: "addr-1" });

    expect(prisma.vendorOrder.create).toHaveBeenCalledTimes(2);

    const vendorAOrder = createdVendorOrders.find(
      (o) => o.vendorId === "vendor-A",
    );
    expect(vendorAOrder?.subtotal).toBe(2000);
    expect(vendorAOrder?.commissionAmount).toBe(200);
    expect(vendorAOrder?.vendorPayoutAmount).toBe(1800);
    // companyAmount + developerAmount subdivide commissionAmount (200 @ 70/30).
    expect(vendorAOrder?.companyAmount).toBe(140);
    expect(vendorAOrder?.developerAmount).toBe(60);
    // Flat 0.10% of subtotal, independent of the commission split.
    expect(vendorAOrder?.superAdminAmount).toBe(2);

    const vendorBOrder = createdVendorOrders.find(
      (o) => o.vendorId === "vendor-B",
    );
    expect(vendorBOrder?.subtotal).toBe(5000);
    expect(vendorBOrder?.commissionAmount).toBe(1000);
    expect(vendorBOrder?.vendorPayoutAmount).toBe(4000);
    expect(vendorBOrder?.companyAmount).toBe(700);
    expect(vendorBOrder?.developerAmount).toBe(300);
    expect(vendorBOrder?.superAdminAmount).toBe(5);

    expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { cartId: "cart-1" },
    });
    expect(result).toBeDefined();
  });
});
