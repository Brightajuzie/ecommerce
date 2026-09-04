import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BuyerTabNavigator } from "./BuyerTabNavigator";
import { ProductDetailScreen } from "../screens/buyer/ProductDetailScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { GuestCheckoutScreen } from "../screens/buyer/GuestCheckoutScreen";
import { CheckoutScreen } from "../screens/buyer/CheckoutScreen";
import { PaymentWebViewScreen } from "../screens/buyer/PaymentWebViewScreen";
import { OrderDetailScreen } from "../screens/buyer/OrderDetailScreen";
import { SetPasswordScreen } from "../screens/buyer/SetPasswordScreen";
import { IdentityVerificationScreen } from "../screens/buyer/IdentityVerificationScreen";
import { NotificationsScreen } from "../screens/buyer/NotificationsScreen";
import type { BuyerStackParamList } from "./types";

const Stack = createNativeStackNavigator<BuyerStackParamList>();

export function BuyerNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="BuyerTabs" component={BuyerTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: "Product" }}
      />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="GuestCheckout"
        component={GuestCheckoutScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="PaymentWebView"
        component={PaymentWebViewScreen}
        options={{ title: "Payment" }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SetPassword"
        component={SetPasswordScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="IdentityVerification"
        component={IdentityVerificationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
