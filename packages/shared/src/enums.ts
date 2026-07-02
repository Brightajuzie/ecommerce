export enum UserRole {
  BUYER = "BUYER",
  VENDOR = "VENDOR",
  ADMIN = "ADMIN",
}

export enum VendorStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  SUSPENDED = "SUSPENDED",
}

export enum ProductStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum OrderStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  PAID = "PAID",
  FAILED = "FAILED",
  FULFILLING = "FULFILLING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum VendorOrderStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

export enum PaymentProvider {
  FLUTTERWAVE = "FLUTTERWAVE",
  OPAY = "OPAY",
}

export enum PaymentStatus {
  INITIATED = "INITIATED",
  SUCCESSFUL = "SUCCESSFUL",
  FAILED = "FAILED",
}
