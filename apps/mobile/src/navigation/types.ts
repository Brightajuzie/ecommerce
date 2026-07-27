export type BuyerStackParamList = {
  BuyerTabs: undefined;
  ProductDetail: { productId: string };
  Login: {
    redirectTo?: "Checkout";
    pendingCartItem?: { productId: string; quantity: number };
  } | undefined;
  Register: {
    redirectTo?: "Checkout";
    pendingCartItem?: { productId: string; quantity: number };
  } | undefined;
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
  ProductForm: { productId?: string } | undefined;
  UserForm: { userId?: string } | undefined;
};

export type AdminTabParamList = {
  PendingVendors: undefined;
  Users: undefined;
  Products: undefined;
  StoreSettings: undefined;
  Slides: undefined;
  Withdrawals: undefined;
  // Visible to both ADMIN and SUPER_ADMIN — only specific sections *within*
  // PaymentSettingsScreen (platform wallet, gateway credentials) are hidden
  // from regular ADMIN. See UserRole.SUPER_ADMIN.
  Payments: undefined;
  Profile: undefined;
};
