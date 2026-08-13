import { ActivityIndicator, View } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { UserRole } from "@ikaystores/shared";
import { useAuthStore } from "../store/authStore";
import { useTheme } from "../theme/ThemeContext";
import { BuyerNavigator } from "./BuyerNavigator";
import { VendorNavigator } from "./VendorNavigator";
import { AdminNavigator } from "./AdminNavigator";
import { LockScreen } from "../screens/auth/LockScreen";

export function RootNavigator() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);
  const isUnlocked = useAuthStore((s) => s.isUnlocked);
  const viewAsBuyer = useAuthStore((s) => s.viewAsBuyer);
  const theme = useTheme();

  // React Navigation paints this behind every screen and during transition
  // animations, so it must track our resolved scheme too — otherwise a
  // dark-mode screen change briefly flashes white underneath it.
  const navigationTheme = {
    ...(theme.scheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.scheme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.colors.background,
      card: theme.colors.surface,
      border: theme.colors.border,
      text: theme.colors.text,
      primary: theme.primaryColor,
    },
  };

  if (!isHydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator color={theme.primaryColor} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {user && biometricEnabled && !isUnlocked ? (
        <LockScreen />
      ) : user && viewAsBuyer ? (
        <BuyerNavigator />
      ) : user?.role === UserRole.VENDOR ? (
        <VendorNavigator />
      ) : user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN ? (
        <AdminNavigator />
      ) : (
        <BuyerNavigator />
      )}
    </NavigationContainer>
  );
}
