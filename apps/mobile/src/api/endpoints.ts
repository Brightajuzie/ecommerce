import type {
  AddressDto,
  AuthTokensDto,
  AddCartItemInput,
  CartDto,
  CategoryDto,
  CheckoutInput,
  CreateProductInput,
  CreateSlideInput,
  InitiatePaymentInput,
  LoginInput,
  OrderDto,
  PaginatedResult,
  ProductDto,
  ProductQueryInput,
  RegisterInput,
  ReorderSlidesInput,
  SettingsDto,
  SlideDto,
  UpdateCartItemInput,
  UpdateProductInput,
  UpdateSettingsInput,
  UpdateSlideInput,
  UpdateVendorOrderStatusInput,
  UserDto,
  VendorOrderDto,
  VendorProfileDto,
  VendorVerificationStatus,
} from "@ikaystores/shared";
import { apiClient } from "./client";

export const AuthApi = {
  register: (input: RegisterInput) =>
    apiClient.post<AuthTokensDto>("/auth/register", input).then((r) => r.data),
  login: (input: LoginInput) =>
    apiClient.post<AuthTokensDto>("/auth/login", input).then((r) => r.data),
};

export const UsersApi = {
  me: () => apiClient.get<UserDto & { vendorProfile: VendorProfileDto | null }>("/users/me").then((r) => r.data),
  listAddresses: () => apiClient.get<AddressDto[]>("/users/me/addresses").then((r) => r.data),
  createAddress: (input: Partial<AddressDto>) =>
    apiClient.post<AddressDto>("/users/me/addresses", input).then((r) => r.data),
};

export const CategoriesApi = {
  list: () => apiClient.get<CategoryDto[]>("/categories").then((r) => r.data),
};

export const ProductsApi = {
  browse: (query: Partial<ProductQueryInput>) =>
    apiClient.get<PaginatedResult<ProductDto>>("/products", { params: query }).then((r) => r.data),
  findOne: (id: string) => apiClient.get<ProductDto>(`/products/${id}`).then((r) => r.data),
  listMine: () => apiClient.get<ProductDto[]>("/products/mine").then((r) => r.data),
  create: (input: CreateProductInput) =>
    apiClient.post<ProductDto>("/products", input).then((r) => r.data),
  update: (id: string, input: UpdateProductInput) =>
    apiClient.patch<ProductDto>(`/products/${id}`, input).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/products/${id}`).then((r) => r.data),
};

export const CartApi = {
  get: () => apiClient.get<CartDto>("/cart").then((r) => r.data),
  addItem: (input: AddCartItemInput) =>
    apiClient.post<CartDto>("/cart/items", input).then((r) => r.data),
  updateItem: (itemId: string, input: UpdateCartItemInput) =>
    apiClient.patch<CartDto>(`/cart/items/${itemId}`, input).then((r) => r.data),
  removeItem: (itemId: string) => apiClient.delete<CartDto>(`/cart/items/${itemId}`).then((r) => r.data),
};

export const OrdersApi = {
  checkout: (input: CheckoutInput) =>
    apiClient.post<OrderDto>("/orders/checkout", input).then((r) => r.data),
  myOrders: () => apiClient.get<OrderDto[]>("/orders").then((r) => r.data),
  findOne: (id: string) => apiClient.get<OrderDto>(`/orders/${id}`).then((r) => r.data),
  vendorOrders: () => apiClient.get<VendorOrderDto[]>("/orders/vendor").then((r) => r.data),
  updateVendorOrderStatus: (vendorOrderId: string, input: UpdateVendorOrderStatusInput) =>
    apiClient.patch(`/orders/vendor/${vendorOrderId}/status`, input).then((r) => r.data),
};

export const PaymentsApi = {
  initiate: (input: InitiatePaymentInput) =>
    apiClient.post<{ checkoutUrl: string; reference: string }>("/payments/initiate", input).then((r) => r.data),
  verify: (reference: string) =>
    apiClient.get<{ status: string; orderStatus: string }>(`/payments/verify/${reference}`).then((r) => r.data),
};

export const VendorsApi = {
  listApproved: () => apiClient.get<VendorProfileDto[]>("/vendors").then((r) => r.data),
  apply: (input: { businessName: string; description?: string }) =>
    apiClient.post<VendorProfileDto>("/vendors/apply", input).then((r) => r.data),
  me: () => apiClient.get<VendorProfileDto>("/vendors/me").then((r) => r.data),
  pending: () => apiClient.get<VendorProfileDto[]>("/vendors/pending").then((r) => r.data),
  approve: (id: string) => apiClient.patch<VendorProfileDto>(`/vendors/${id}/approve`).then((r) => r.data),
  suspend: (id: string) => apiClient.patch<VendorProfileDto>(`/vendors/${id}/suspend`).then((r) => r.data),
};

export const SettingsApi = {
  get: () => apiClient.get<SettingsDto>("/settings").then((r) => r.data),
  update: (input: UpdateSettingsInput) =>
    apiClient.patch<SettingsDto>("/settings", input).then((r) => r.data),
};

export const SlidesApi = {
  listActive: () => apiClient.get<SlideDto[]>("/slides").then((r) => r.data),
  listAll: () => apiClient.get<SlideDto[]>("/slides/all").then((r) => r.data),
  create: (input: CreateSlideInput) => apiClient.post<SlideDto>("/slides", input).then((r) => r.data),
  update: (id: string, input: UpdateSlideInput) =>
    apiClient.patch<SlideDto>(`/slides/${id}`, input).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/slides/${id}`).then((r) => r.data),
  reorder: (input: ReorderSlidesInput) =>
    apiClient.patch<SlideDto[]>("/slides/reorder", input).then((r) => r.data),
};

export const KycApi = {
  status: () =>
    apiClient
      .get<{ verificationStatus: VendorVerificationStatus; verifiedAt: string | null }>(
        "/kyc/status",
      )
      .then((r) => r.data),
};
