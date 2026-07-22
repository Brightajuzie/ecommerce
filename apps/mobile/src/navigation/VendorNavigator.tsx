import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { VendorStatus } from "@ikaystores/shared";
import { VendorsApi } from "../api/endpoints";
import { VendorTabNavigator } from "./VendorTabNavigator";
import { ProductFormScreen } from "../screens/vendor/ProductFormScreen";
import { VendorPendingScreen } from "../screens/vendor/VendorPendingScreen";
import type { VendorStackParamList } from "./types";

const Stack = createNativeStackNavigator<VendorStackParamList>();

export function VendorNavigator() {
  const vendorProfileQuery = useQuery({ queryKey: ["vendorMe"], queryFn: VendorsApi.me });

  if (vendorProfileQuery.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (vendorProfileQuery.data?.status !== VendorStatus.APPROVED) {
    return <VendorPendingScreen />;
  }

  return (
    <Stack.Navigator>
      <Stack.Screen name="VendorTabs" component={VendorTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="ProductForm"
        component={ProductFormScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
