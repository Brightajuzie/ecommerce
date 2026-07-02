import {
  OrderStatus,
  PaymentProvider,
  ProductStatus,
  UserRole,
  VendorOrderStatus,
  VendorStatus,
} from "./enums";

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
