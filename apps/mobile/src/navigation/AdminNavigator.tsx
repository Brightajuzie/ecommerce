import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AdminTabNavigator } from "./AdminTabNavigator";
import { SlideFormScreen } from "../screens/admin/SlideFormScreen";
import type { AdminStackParamList } from "./types";

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AdminTabs" component={AdminTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="SlideForm" component={SlideFormScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
