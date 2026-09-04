import {
  NotificationType,
  OrderStatus,
  PaymentProvider,
  ProductStatus,
  UserRole,
  VendorOrderStatus,
  VendorStatus,
  WalletTransactionType,
  WithdrawalStatus,
} from "./enums";

export interface PayoutAccountDto {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  verifiedAt: string;
}

export interface BankDto {
  code: string;
  name: string;
}

export interface UserDto {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  // False only for a still-unclaimed guest-checkout account — see
  // AuthService.guestCheckout/setPassword. True for every other account.
  hasPassword: boolean;
  createdAt: string;
}

export interface AddressDto {
  id: string;
  userId: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  country: string;
  phone: string;
  isDefault: boolean;
  createdAt: string;
}

export interface VendorProfileDto {
  id: string;
  userId: string;
  businessName: string;
  description: string | null;
  logoUrl: string | null;
  status: VendorStatus;
  commissionRate: number;
  payoutAccount: PayoutAccountDto | null;
  businessRegistrationDocUrl: string | null;
  governmentIdDocUrl: string | null;
  // Sourced from the associated User via a join — only present on endpoints
  // that need it (getMyVendorProfile, admin's listPending); absent (not
  // just false) on the public listApproved() and apply() responses.
  identityVerified?: boolean;
  livenessVerified?: boolean;
  // Present on getMyVendorProfile (messages from admin the vendor hasn't
  // opened yet) and admin's listAll (messages from the vendor no admin has
  // read yet) — see VendorsService for exactly what each side counts.
  unreadMessageCount?: number;
}

// A single message in a vendor's one shared thread with the admin team —
// see VendorMessage in schema.prisma for the full read-tracking/broadcast
// design. `sender` is null only for VendorComplianceService's automated
// suspension-risk warning (isSystemMessage: true).
export interface VendorMessageSenderDto {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface VendorMessageDto {
  id: string;
  vendorId: string;
  senderId: string | null;
  sender: VendorMessageSenderDto | null;
  isSystemMessage: boolean;
  body: string;
  isBroadcast: boolean;
  readByVendorAt: string | null;
  readByAdminAt: string | null;
  createdAt: string;
}

export interface NotificationDto {
  id: string;
  // Null on an admin-broadcast row (see Notification.userId in
  // schema.prisma) — never null on a row returned from GET /notifications
  // (the buyer's own feed), only possibly null from GET /notifications/admin.
  userId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  orderId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export interface ProductDto {
  id: string;
  vendorId: string;
  categoryId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  images: string[];
  status: ProductStatus;
  weight: string | null;
  brand: string | null;
  sku: string | null;
  createdAt: string;
}

export interface CartItemDto {
  id: string;
  productId: string;
  quantity: number;
  priceAtAdd: number;
  product: ProductDto;
}

export interface CartDto {
  id: string;
  items: CartItemDto[];
}

export interface OrderItemDto {
  id: string;
  productId: string;
  title: string;
  price: number;
  quantity: number;
}

export interface VendorOrderDto {
  id: string;
  vendorId: string;
  subtotal: number;
  commissionAmount: number;
  vendorPayoutAmount: number;
  companyAmount: number;
  developerAmount: number;
  superAdminAmount: number;
  status: VendorOrderStatus;
  items: OrderItemDto[];
}

export interface OrderDto {
  id: string;
  buyerId: string;
  deliveryFee: number;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  paymentProvider: PaymentProvider | null;
  paymentReference: string | null;
  vendorOrders: VendorOrderDto[];
  createdAt: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface SettingsDto {
  id: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string | null;
  logoUrl: string | null;
  referralBonusAmount: number;
  deliveryFee: number;
  // Actually stored on PlatformPaymentSettings, merged in read-only by
  // SettingsService.get() so checkout can see it without admin access —
  // see PaymentSettingsService for where it's actually written.
  codEnabled: boolean;
  updatedAt: string;
}

export interface SlideDto {
  id: string;
  imageUrl: string;
  title: string | null;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface UploadResultDto {
  url: string;
}

export interface WalletTransactionDto {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  vendorOrderId: string | null;
  withdrawalRequestId: string | null;
  createdAt: string;
}

export interface IdentityVerificationResultDto {
  verified: boolean;
  idType: "NIN" | "BVN";
  fullName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  message: string;
}

export interface LivenessCheckResultDto {
  live: boolean;
  confidence: number | null;
  message: string;
}

export interface WalletDto {
  id: string;
  vendorId: string | null;
  buyerId?: string | null;
  balance: number;
  currency: string;
  updatedAt: string;
  transactions: WalletTransactionDto[];
}

export interface WithdrawalRequestDto {
  id: string;
  walletId: string;
  vendorId: string | null;
  amount: number;
  status: WithdrawalStatus;
  providerReference: string | null;
  failureReason: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  paidAt: string | null;
  vendor?: { businessName: string };
}

export interface PlatformPaymentSettingsDto {
  id: string;
  companySharePercent: number;
  developerSharePercent: number;
  superAdminFeePercent: number;
  payoutAccount: PayoutAccountDto | null;
  updatedAt: string;
}

// Secret fields (flutterwaveSecretKey, flutterwaveEncryptionKey,
// opaySecretKey) come back masked (e.g. "••••1234") once set, never in
// full — see payment-settings.service.ts's maskSecret().
export interface GatewaySettingsDto {
  flutterwavePublicKey: string | null;
  flutterwaveSecretKey: string | null;
  flutterwaveEncryptionKey: string | null;
  opayMerchantId: string | null;
  opayPublicKey: string | null;
  opaySecretKey: string | null;
  supportEmail: string | null;
  dojahAppId: string | null;
  dojahSecretKey: string | null;
  dojahEnvironment: string | null;
  codEnabled: boolean;
  gmailUser: string | null;
  gmailAppPassword: string | null;
}

// Admin-facing user record — scoped to BUYER/VENDOR accounts only, see
// users.service.ts's listForAdmin/createForAdmin/updateForAdmin.
export interface AdminUserDto {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  vendorProfile: { id: string; businessName: string; status: VendorStatus } | null;
}

export interface AdminProductDto extends ProductDto {
  vendor: { businessName: string };
}
