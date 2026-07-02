export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type BuyerStackParamList = {
  BuyerTabs: undefined;
  ProductDetail: { productId: string };
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
  Profile: undefined;
};
