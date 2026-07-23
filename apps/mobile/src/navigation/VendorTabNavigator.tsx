import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { MyProductsScreen } from "../screens/vendor/MyProductsScreen";
import { VendorOrdersScreen } from "../screens/vendor/VendorOrdersScreen";
import { WalletScreen } from "../screens/vendor/WalletScreen";
import { ProfileScreen } from "../screens/buyer/ProfileScreen";
import { useTheme } from "../theme/ThemeContext";
import { ResponsiveTabBar } from "./ResponsiveTabBar";
import type { VendorTabParamList } from "./types";

const Tab = createBottomTabNavigator<VendorTabParamList>();

const TAB_ICONS: Record<keyof VendorTabParamList, keyof typeof Ionicons.glyphMap> = {
  MyProducts: "cube",
  VendorOrders: "receipt",
  Wallet: "wallet",
  Profile: "person",
};

export function VendorTabNavigator() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      tabBar={Platform.OS === "web" ? (props) => <ResponsiveTabBar {...props} /> : undefined}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarPosition: Platform.OS === "web" ? "top" : "bottom",
        tabBarActiveTintColor: theme.primaryColor,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name as keyof VendorTabParamList]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="MyProducts" component={MyProductsScreen} options={{ title: "My Products" }} />
      <Tab.Screen name="VendorOrders" component={VendorOrdersScreen} options={{ title: "Orders" }} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
