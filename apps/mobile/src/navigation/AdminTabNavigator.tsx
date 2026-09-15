import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { UserRole } from "@ikaystores/shared";
import { AdminDashboardScreen } from "../screens/admin/AdminDashboardScreen";
import { PendingVendorsScreen } from "../screens/admin/PendingVendorsScreen";
import { AdminUsersScreen } from "../screens/admin/AdminUsersScreen";
import { AdminProductsScreen } from "../screens/admin/AdminProductsScreen";
import { StoreSettingsScreen } from "../screens/admin/StoreSettingsScreen";
import { SlidesScreen } from "../screens/admin/SlidesScreen";
import { WithdrawalsScreen } from "../screens/admin/WithdrawalsScreen";
import { PaymentSettingsScreen } from "../screens/admin/PaymentSettingsScreen";
import { AdminTransactionsScreen } from "../screens/admin/AdminTransactionsScreen";
import { ProfileScreen } from "../screens/buyer/ProfileScreen";
import { useAuthStore } from "../store/authStore";
import { useTheme } from "../theme/ThemeContext";
import { ResponsiveTabBar } from "./ResponsiveTabBar";
import type { AdminTabParamList } from "./types";

const Tab = createBottomTabNavigator<AdminTabParamList>();

const TAB_ICONS: Record<keyof AdminTabParamList, keyof typeof Ionicons.glyphMap> = {
  Dashboard: "grid",
  PendingVendors: "checkmark-done",
  Users: "people",
  Products: "cube",
  StoreSettings: "settings",
  Slides: "images",
  Withdrawals: "cash",
  Payments: "card",
  Transactions: "receipt",
  Profile: "person",
};

// ADMIN and SUPER_ADMIN see every tab here, including revenue-split
// settings under "Payments" — PaymentSettingsScreen itself hides only the
// platform/super-admin wallet section from regular ADMIN. EDITOR is
// content-only (see UsersService.manageableRolesFor on the backend, which
// enforces the same boundary server-side): no Vendors, Users, Withdrawals,
// Payments, or Transactions tabs, and no Dashboard either since its
// stats/quick-actions are entirely about those. It lands on Products instead.
export function AdminTabNavigator() {
  const theme = useTheme();
  const isEditor = useAuthStore((s) => s.user?.role === UserRole.EDITOR);

  return (
    <Tab.Navigator
      tabBar={Platform.OS === "web" ? (props) => <ResponsiveTabBar {...props} /> : undefined}
      initialRouteName={isEditor ? "Products" : "Dashboard"}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarPosition: Platform.OS === "web" ? "top" : "bottom",
        tabBarActiveTintColor: theme.primaryColor,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name as keyof AdminTabParamList]} color={color} size={size} />
        ),
      })}
    >
      {!isEditor && <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />}
      {!isEditor && (
        <Tab.Screen name="PendingVendors" component={PendingVendorsScreen} options={{ title: "Vendors" }} />
      )}
      {!isEditor && <Tab.Screen name="Users" component={AdminUsersScreen} />}
      <Tab.Screen name="Products" component={AdminProductsScreen} />
      <Tab.Screen name="StoreSettings" component={StoreSettingsScreen} options={{ title: "Settings" }} />
      <Tab.Screen name="Slides" component={SlidesScreen} />
      {!isEditor && <Tab.Screen name="Withdrawals" component={WithdrawalsScreen} />}
      {!isEditor && <Tab.Screen name="Payments" component={PaymentSettingsScreen} />}
      {!isEditor && <Tab.Screen name="Transactions" component={AdminTransactionsScreen} />}
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
