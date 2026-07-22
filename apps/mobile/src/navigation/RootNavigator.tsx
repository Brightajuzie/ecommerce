import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { UserRole } from "@ikaystores/shared";
import { useAuthStore } from "../store/authStore";
import { BuyerNavigator } from "./BuyerNavigator";
import { VendorNavigator } from "./VendorNavigator";
import { AdminNavigator } from "./AdminNavigator";
import { LockScreen } from "../screens/auth/LockScreen";

export function RootNavigator() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);
  const isUnlocked = useAuthStore((s) => s.isUnlocked);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user && biometricEnabled && !isUnlocked ? (
        <LockScreen />
      ) : user?.role === UserRole.VENDOR ? (
        <VendorNavigator />
      ) : user?.role === UserRole.ADMIN ? (
        <AdminNavigator />
      ) : (
        <BuyerNavigator />
      )}
    </NavigationContainer>
  );
}
