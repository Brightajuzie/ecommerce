import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { UserRole } from "@ikstore/shared";
import { useAuthStore } from "../store/authStore";
import { AuthNavigator } from "./AuthNavigator";
import { BuyerNavigator } from "./BuyerNavigator";
import { VendorNavigator } from "./VendorNavigator";
import { PendingVendorsScreen } from "../screens/admin/PendingVendorsScreen";

export function RootNavigator() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user ? (
        <AuthNavigator />
      ) : user.role === UserRole.VENDOR ? (
        <VendorNavigator />
      ) : user.role === UserRole.ADMIN ? (
        <PendingVendorsScreen />
      ) : (
        <BuyerNavigator />
      )}
    </NavigationContainer>
  );
}
