import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { HomeScreen } from "../screens/buyer/HomeScreen";
import { CartScreen } from "../screens/buyer/CartScreen";
import { OrderHistoryScreen } from "../screens/buyer/OrderHistoryScreen";
import { ProfileScreen } from "../screens/buyer/ProfileScreen";
import { useTheme } from "../theme/ThemeContext";
import { ResponsiveTabBar } from "./ResponsiveTabBar";
import type { BuyerTabParamList } from "./types";

const Tab = createBottomTabNavigator<BuyerTabParamList>();

const TAB_ICONS: Record<keyof BuyerTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: "home",
  Cart: "cart",
  Orders: "receipt",
  Profile: "person",
};

export function BuyerTabNavigator() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      tabBar={Platform.OS === "web" ? (props) => <ResponsiveTabBar {...props} /> : undefined}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarPosition: Platform.OS === "web" ? "top" : "bottom",
        tabBarActiveTintColor: theme.primaryColor,
        tabBarInactiveTintColor: "#9CA3AF",
        title: route.name,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name as keyof BuyerTabParamList]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Orders" component={OrderHistoryScreen} options={{ title: "My Orders" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
