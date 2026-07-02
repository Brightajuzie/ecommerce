import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HomeScreen } from "../screens/buyer/HomeScreen";
import { CartScreen } from "../screens/buyer/CartScreen";
import { OrderHistoryScreen } from "../screens/buyer/OrderHistoryScreen";
import { ProfileScreen } from "../screens/buyer/ProfileScreen";
import type { BuyerTabParamList } from "./types";

const Tab = createBottomTabNavigator<BuyerTabParamList>();

export function BuyerTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Orders" component={OrderHistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
