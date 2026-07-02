import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BuyerTabNavigator } from "./BuyerTabNavigator";
import { ProductDetailScreen } from "../screens/buyer/ProductDetailScreen";
import { CheckoutScreen } from "../screens/buyer/CheckoutScreen";
import { PaymentWebViewScreen } from "../screens/buyer/PaymentWebViewScreen";
import { OrderDetailScreen } from "../screens/buyer/OrderDetailScreen";
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
    </Stack.Navigator>
  );
}
