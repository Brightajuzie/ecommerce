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
  // Default path from a guest's cart — pay first, no account required up
  // front. Only ever reached with redirectTo: "Checkout" today, but keeps
  // the same optional shape as Login/Register for consistency.
  GuestCheckout: {
    redirectTo?: "Checkout";
  } | undefined;
  Checkout: undefined;
  PaymentWebView: { checkoutUrl: string; orderId: string };
  OrderDetail: { orderId: string };
  SetPassword: undefined;
  IdentityVerification: undefined;
  Notifications: undefined;
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
  IdentityVerification: undefined;
  LivenessCheck: undefined;
  VendorPending: undefined;
  VendorChat: undefined;
};

export type VendorTabParamList = {
  Dashboard: undefined;
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
  IdentityVerification: undefined;
  VendorChat: { vendorId: string; businessName: string };
  BroadcastMessage: undefined;
  Notifications: undefined;
};

export type AdminTabParamList = {
  Dashboard: undefined;
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
