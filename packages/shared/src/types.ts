import {
  OrderStatus,
  PaymentProvider,
  ProductStatus,
  UserRole,
  VendorOrderStatus,
  VendorStatus,
  VendorVerificationStatus,
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
  verificationStatus: VendorVerificationStatus;
  verifiedAt: string | null;
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

export interface WalletDto {
  id: string;
  vendorId: string | null;
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
