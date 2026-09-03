import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AdminTabNavigator } from "./AdminTabNavigator";
import { SlideFormScreen } from "../screens/admin/SlideFormScreen";
import { AdminUserFormScreen } from "../screens/admin/AdminUserFormScreen";
import { AdminVendorChatScreen } from "../screens/admin/AdminVendorChatScreen";
import { BroadcastMessageScreen } from "../screens/admin/BroadcastMessageScreen";
import { ProductFormScreen } from "../screens/vendor/ProductFormScreen";
import { IdentityVerificationScreen } from "../screens/buyer/IdentityVerificationScreen";
import type { AdminStackParamList } from "./types";

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AdminTabs" component={AdminTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="SlideForm" component={SlideFormScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProductForm" component={ProductFormScreen} options={{ headerShown: false }} />
      <Stack.Screen name="UserForm" component={AdminUserFormScreen} options={{ headerShown: false }} />
      <Stack.Screen name="VendorChat" component={AdminVendorChatScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="BroadcastMessage"
        component={BroadcastMessageScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="IdentityVerification"
        component={IdentityVerificationScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
