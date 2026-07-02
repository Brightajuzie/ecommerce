import { BadRequestException } from "@nestjs/common";
import { OrdersService } from "./orders.service";

describe("OrdersService.checkout", () => {
  let service: OrdersService;
  let prisma: any;

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
    service = new OrdersService(prisma);
  });

  it("throws when the address does not belong to the buyer", async () => {
    prisma.address.findUnique.mockResolvedValue({ id: "addr-1", userId: "someone-else" });

    await expect(
      service.checkout("buyer-1", { addressId: "addr-1" }),
    ).rejects.toThrow();
  });

  it("throws when the cart is empty", async () => {
    prisma.address.findUnique.mockResolvedValue({ id: "addr-1", userId: "buyer-1" });
    prisma.cart.findUnique.mockResolvedValue({ id: "cart-1", items: [] });

    await expect(
      service.checkout("buyer-1", { addressId: "addr-1" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws when requested quantity exceeds stock", async () => {
    prisma.address.findUnique.mockResolvedValue({ id: "addr-1", userId: "buyer-1" });
    prisma.cart.findUnique.mockResolvedValue({
      id: "cart-1",
      items: [
        {
          productId: "p1",
          quantity: 5,
          priceAtAdd: 1000,
          product: { id: "p1", title: "Widget", stock: 2, vendorId: "v1", currency: "NGN", vendor: { commissionRate: 10 } },
        },
      ],
    });

    await expect(
      service.checkout("buyer-1", { addressId: "addr-1" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("splits a multi-vendor cart into one VendorOrder per vendor with correct commission math", async () => {
    prisma.address.findUnique.mockResolvedValue({ id: "addr-1", userId: "buyer-1" });
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

    const createdVendorOrders: any[] = [];
    prisma.vendorOrder.create.mockImplementation(({ data }: any) => {
      createdVendorOrders.push(data);
      return Promise.resolve(data);
    });
    prisma.order.create.mockResolvedValue({ id: "order-1" });
    prisma.order.findUniqueOrThrow.mockResolvedValue({ id: "order-1", vendorOrders: createdVendorOrders });

    prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));

    const result = await service.checkout("buyer-1", { addressId: "addr-1" });

    expect(prisma.vendorOrder.create).toHaveBeenCalledTimes(2);

    const vendorAOrder = createdVendorOrders.find((o) => o.vendorId === "vendor-A");
    expect(vendorAOrder.subtotal).toBe(2000);
    expect(vendorAOrder.commissionAmount).toBe(200);
    expect(vendorAOrder.vendorPayoutAmount).toBe(1800);

    const vendorBOrder = createdVendorOrders.find((o) => o.vendorId === "vendor-B");
    expect(vendorBOrder.subtotal).toBe(5000);
    expect(vendorBOrder.commissionAmount).toBe(1000);
    expect(vendorBOrder.vendorPayoutAmount).toBe(4000);

    expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: "cart-1" } });
    expect(result).toBeDefined();
  });
});
