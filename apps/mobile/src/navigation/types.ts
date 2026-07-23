export type BuyerStackParamList = {
  BuyerTabs: undefined;
  ProductDetail: { productId: string };
  Login: { redirectTo?: "Checkout" } | undefined;
  Register: { redirectTo?: "Checkout" } | undefined;
  Checkout: undefined;
  PaymentWebView: { checkoutUrl: string; orderId: string };
  OrderDetail: { orderId: string };
};

export type BuyerTabParamList = {
  Home: undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};

export type VendorStackParamList = {
  VendorTabs: undefined;
  ProductForm: { productId?: string } | undefined;
};

export type VendorTabParamList = {
  MyProducts: undefined;
  VendorOrders: undefined;
  Wallet: undefined;
  Profile: undefined;
};

export type AdminStackParamList = {
  AdminTabs: undefined;
  SlideForm: { slideId?: string } | undefined;
};

export type AdminTabParamList = {
  PendingVendors: undefined;
  StoreSettings: undefined;
  Slides: undefined;
  Withdrawals: undefined;
  // SUPER_ADMIN only — AdminTabNavigator omits this screen entirely for
  // regular ADMIN users. See UserRole.SUPER_ADMIN.
  Payments: undefined;
  Profile: undefined;
};
