import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { PendingVendorsScreen } from "../screens/admin/PendingVendorsScreen";
import { StoreSettingsScreen } from "../screens/admin/StoreSettingsScreen";
import { SlidesScreen } from "../screens/admin/SlidesScreen";
import { WithdrawalsScreen } from "../screens/admin/WithdrawalsScreen";
import { PaymentSettingsScreen } from "../screens/admin/PaymentSettingsScreen";
import { ProfileScreen } from "../screens/buyer/ProfileScreen";
import { useTheme } from "../theme/ThemeContext";
import { ResponsiveTabBar } from "./ResponsiveTabBar";
import type { AdminTabParamList } from "./types";

const Tab = createBottomTabNavigator<AdminTabParamList>();

const TAB_ICONS: Record<keyof AdminTabParamList, keyof typeof Ionicons.glyphMap> = {
  PendingVendors: "checkmark-done",
  StoreSettings: "settings",
  Slides: "images",
  Withdrawals: "cash",
  Payments: "card",
  Profile: "person",
};

// Both ADMIN and SUPER_ADMIN see every tab here, including revenue-split
// settings under "Payments" — PaymentSettingsScreen itself hides only the
// platform/super-admin wallet section from regular ADMIN.
export function AdminTabNavigator() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      tabBar={Platform.OS === "web" ? (props) => <ResponsiveTabBar {...props} /> : undefined}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarPosition: Platform.OS === "web" ? "top" : "bottom",
        tabBarActiveTintColor: theme.primaryColor,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name as keyof AdminTabParamList]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="PendingVendors" component={PendingVendorsScreen} options={{ title: "Vendors" }} />
      <Tab.Screen name="StoreSettings" component={StoreSettingsScreen} options={{ title: "Settings" }} />
      <Tab.Screen name="Slides" component={SlidesScreen} />
      <Tab.Screen name="Withdrawals" component={WithdrawalsScreen} />
      <Tab.Screen name="Payments" component={PaymentSettingsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
