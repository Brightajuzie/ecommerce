import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { PendingVendorsScreen } from "../screens/admin/PendingVendorsScreen";
import { StoreSettingsScreen } from "../screens/admin/StoreSettingsScreen";
import { SlidesScreen } from "../screens/admin/SlidesScreen";
import { ProfileScreen } from "../screens/buyer/ProfileScreen";
import { useTheme } from "../theme/ThemeContext";
import type { AdminTabParamList } from "./types";

const Tab = createBottomTabNavigator<AdminTabParamList>();

export function AdminTabNavigator() {
  const theme = useTheme();
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.primaryColor }}>
      <Tab.Screen name="PendingVendors" component={PendingVendorsScreen} />
      <Tab.Screen name="StoreSettings" component={StoreSettingsScreen} />
      <Tab.Screen name="Slides" component={SlidesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
