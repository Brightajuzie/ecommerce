import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { VendorStatus } from "@ikaystores/shared";
import { VendorsApi } from "../api/endpoints";
import { VendorTabNavigator } from "./VendorTabNavigator";
import { ProductFormScreen } from "../screens/vendor/ProductFormScreen";
import { VendorPendingScreen } from "../screens/vendor/VendorPendingScreen";
import { IdentityVerificationScreen } from "../screens/buyer/IdentityVerificationScreen";
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

  const isApproved = vendorProfileQuery.data?.status === VendorStatus.APPROVED;

  // VendorPendingScreen is a real Stack.Screen (not rendered as a bare
  // component outside the navigator) so it can call navigation.navigate
  // to reach IdentityVerification — same navigator either way, just a
  // different set of screens depending on approval status.
  return (
    <Stack.Navigator>
      {isApproved ? (
        <>
          <Stack.Screen name="VendorTabs" component={VendorTabNavigator} options={{ headerShown: false }} />
          <Stack.Screen
            name="ProductForm"
            component={ProductFormScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        <Stack.Screen
          name="VendorPending"
          component={VendorPendingScreen}
          options={{ headerShown: false }}
        />
      )}
      <Stack.Screen
        name="IdentityVerification"
        component={IdentityVerificationScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
