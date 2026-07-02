import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MyProductsScreen } from "../screens/vendor/MyProductsScreen";
import { VendorOrdersScreen } from "../screens/vendor/VendorOrdersScreen";
import { ProfileScreen } from "../screens/buyer/ProfileScreen";
import { useTheme } from "../theme/ThemeContext";
import type { VendorTabParamList } from "./types";

const Tab = createBottomTabNavigator<VendorTabParamList>();

export function VendorTabNavigator() {
  const theme = useTheme();
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.primaryColor }}>
      <Tab.Screen name="MyProducts" component={MyProductsScreen} />
      <Tab.Screen name="VendorOrders" component={VendorOrdersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
