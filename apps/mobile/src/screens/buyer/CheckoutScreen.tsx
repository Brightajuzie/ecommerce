import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AddressDto } from "@ikstore/shared";
import { PaymentProvider } from "@ikstore/shared";
import { UsersApi, OrdersApi, PaymentsApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import { FormInput } from "../../components/FormInput";
import { useTheme } from "../../theme/ThemeContext";
import type { BuyerStackParamList } from "../../navigation/types";

export function CheckoutScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const queryClient = useQueryClient();
  const theme = useTheme();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: "Home", line1: "", city: "", state: "", phone: "" });
  const [provider, setProvider] = useState<PaymentProvider>(PaymentProvider.FLUTTERWAVE);

  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: UsersApi.listAddresses,
  });

  const createAddress = useMutation({
    mutationFn: () => UsersApi.createAddress({ ...newAddress, isDefault: true }),
    onSuccess: (address: AddressDto) => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      setSelectedAddressId(address.id);
      setShowNewAddress(false);
    },
    onError: (error: any) => {
      Alert.alert("Could not save address", error?.response?.data?.message ?? "Please try again.");
    },
  });

  const placeOrder = useMutation({
    mutationFn: async () => {
      if (!selectedAddressId) throw new Error("Select a delivery address first.");
      const order = await OrdersApi.checkout({ addressId: selectedAddressId });
      const payment = await PaymentsApi.initiate({ orderId: order.id, provider });
      return { order, payment };
    },
    onSuccess: ({ order, payment }) => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      navigation.navigate("PaymentWebView", { checkoutUrl: payment.checkoutUrl, orderId: order.id });
    },
    onError: (error: any) => {
      Alert.alert("Checkout failed", error?.response?.data?.message ?? "Please try again.");
    },
  });

  const addresses = addressesQuery.data ?? [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkout</Text>

      <Text style={styles.sectionLabel}>Delivery address</Text>
      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        style={styles.addressList}
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.addressCard,
              selectedAddressId === item.id && [
                styles.addressCardActive,
                { borderColor: theme.primaryColor },
              ],
            ]}
            onPress={() => setSelectedAddressId(item.id)}
          >
            <Text style={styles.addressLabel}>{item.label}</Text>
            <Text style={styles.addressText}>
              {item.line1}, {item.city}, {item.state}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No saved addresses yet.</Text>}
      />

      {!showNewAddress ? (
        <Text style={styles.link} onPress={() => setShowNewAddress(true)}>
          + Add a new address
        </Text>
      ) : (
        <View style={styles.newAddressForm}>
          <FormInput
            label="Label"
            value={newAddress.label}
            onChangeText={(v) => setNewAddress((a) => ({ ...a, label: v }))}
          />
          <FormInput
            label="Address line"
            value={newAddress.line1}
            onChangeText={(v) => setNewAddress((a) => ({ ...a, line1: v }))}
          />
          <FormInput
            label="City"
            value={newAddress.city}
            onChangeText={(v) => setNewAddress((a) => ({ ...a, city: v }))}
          />
          <FormInput
            label="State"
            value={newAddress.state}
            onChangeText={(v) => setNewAddress((a) => ({ ...a, state: v }))}
          />
          <FormInput
            label="Phone"
            value={newAddress.phone}
            onChangeText={(v) => setNewAddress((a) => ({ ...a, phone: v }))}
            keyboardType="phone-pad"
          />
          <PrimaryButton
            title="Save address"
            onPress={() => createAddress.mutate()}
            loading={createAddress.isPending}
          />
        </View>
      )}

      <Text style={styles.sectionLabel}>Payment method</Text>
      <View style={styles.providerRow}>
        <Pressable
          style={[
            styles.providerChip,
            provider === PaymentProvider.FLUTTERWAVE && { backgroundColor: theme.primaryColor },
          ]}
          onPress={() => setProvider(PaymentProvider.FLUTTERWAVE)}
        >
          <Text
            style={[
              styles.providerChipText,
              provider === PaymentProvider.FLUTTERWAVE && styles.providerChipTextActive,
            ]}
          >
            Flutterwave
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.providerChip,
            provider === PaymentProvider.OPAY && { backgroundColor: theme.primaryColor },
          ]}
          onPress={() => setProvider(PaymentProvider.OPAY)}
        >
          <Text
            style={[
              styles.providerChipText,
              provider === PaymentProvider.OPAY && styles.providerChipTextActive,
            ]}
          >
            Opay
          </Text>
        </Pressable>
      </View>

      {placeOrder.isPending ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <PrimaryButton
          title="Pay now"
          onPress={() => placeOrder.mutate()}
          disabled={!selectedAddressId}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 16 },
  sectionLabel: { fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 16, marginBottom: 8 },
  addressList: { maxHeight: 180 },
  addressCard: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  addressCardActive: { borderColor: "#111827", backgroundColor: "#F9FAFB" },
  addressLabel: { fontWeight: "700", color: "#111827" },
  addressText: { color: "#6B7280", marginTop: 2 },
  empty: { color: "#6B7280", marginBottom: 8 },
  link: { color: "#111827", fontWeight: "600", marginTop: 8 },
  newAddressForm: { marginTop: 12 },
  providerRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  providerChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  providerChipText: { color: "#374151", fontWeight: "600" },
  providerChipTextActive: { color: "#fff" },
});
