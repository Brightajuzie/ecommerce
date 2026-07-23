export enum UserRole {
  BUYER = "BUYER",
  VENDOR = "VENDOR",
  ADMIN = "ADMIN",
  // Only role that can see/manage the platform wallet and the
  // company/developer/super-admin revenue-split settings — hidden from ADMIN.
  SUPER_ADMIN = "SUPER_ADMIN",
}

export enum VendorStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  SUSPENDED = "SUSPENDED",
}

export enum VendorVerificationStatus {
  NOT_STARTED = "NOT_STARTED",
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  FAILED = "FAILED",
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

export enum WalletTransactionType {
  CREDIT = "CREDIT",
  DEBIT = "DEBIT",
}

export enum WithdrawalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  PROCESSING = "PROCESSING",
  PAID = "PAID",
  REJECTED = "REJECTED",
  FAILED = "FAILED",
}
