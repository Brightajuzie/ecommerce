import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AddressDto } from "@ikaystores/shared";
import { PaymentProvider } from "@ikaystores/shared";
import { UsersApi, OrdersApi, PaymentsApi } from "../../api/endpoints";
import { getErrorMessage } from "../../api/errorMessage";
import { PrimaryButton } from "../../components/PrimaryButton";
import { FormInput } from "../../components/FormInput";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../theme/ThemeContext";
import type { BuyerStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 700;

export function CheckoutScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: "Home", line1: "", city: "", state: "", phone: "" });
  const [provider, setProvider] = useState<PaymentProvider>(PaymentProvider.FLUTTERWAVE);

  // Defends this screen directly rather than relying solely on CartScreen's
  // button routing guests to Login first — e.g. a stale deep link or a
  // future caller that navigates here without going through the cart.
  useEffect(() => {
    if (!user) {
      navigation.replace("Login", { redirectTo: "Checkout" });
    }
  }, [user, navigation]);

  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: UsersApi.listAddresses,
    enabled: !!user,
  });

  const createAddress = useMutation({
    mutationFn: () => UsersApi.createAddress({ ...newAddress, isDefault: true }),
    onSuccess: (address: AddressDto) => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      setSelectedAddressId(address.id);
      setShowNewAddress(false);
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
  });

  // Rendered inline rather than via Alert.alert (see RegisterScreen for the
  // same fix and why): on web, Alert.alert can be silently suppressed by
  // some mobile browsers, which would otherwise leave a checkout failure —
  // including "the order was created but payment couldn't be initiated" —
  // completely invisible to the user.
  const checkoutErrorMessage = placeOrder.isError
    ? getErrorMessage(placeOrder.error, "Checkout failed. Please try again.")
    : createAddress.isError
      ? getErrorMessage(createAddress.error, "Could not save address. Please try again.")
      : null;

  const addresses = addressesQuery.data ?? [];

  if (!user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primaryColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.centeredColumn}>
        <Text style={styles.title}>Checkout</Text>

        {checkoutErrorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={styles.errorBannerText}>{checkoutErrorMessage}</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={16} color={theme.primaryColor} />
            <Text style={styles.sectionLabel}>Delivery address</Text>
          </View>

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
                    { borderColor: theme.primaryColor, backgroundColor: theme.accentColor ?? "#F0FDF4" },
                  ],
                ]}
                onPress={() => setSelectedAddressId(item.id)}
              >
                <View style={styles.addressRadio}>
                  {selectedAddressId === item.id && (
                    <View style={[styles.addressRadioDot, { backgroundColor: theme.primaryColor }]} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressLabel}>{item.label}</Text>
                  <Text style={styles.addressText}>
                    {item.line1}, {item.city}, {item.state}
                  </Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No saved addresses yet.</Text>}
          />

          {!showNewAddress ? (
            <Pressable onPress={() => setShowNewAddress(true)} style={styles.addAddressButton}>
              <Ionicons name="add-circle-outline" size={16} color={theme.primaryColor} />
              <Text style={[styles.link, { color: theme.primaryColor }]}>Add a new address</Text>
            </Pressable>
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
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card" size={16} color={theme.primaryColor} />
            <Text style={styles.sectionLabel}>Payment method</Text>
          </View>
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
        </View>

        {placeOrder.isPending ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={theme.primaryColor} />
        ) : (
          <PrimaryButton
            title="Pay now"
            onPress={() => placeOrder.mutate()}
            disabled={!selectedAddressId}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", paddingTop: 60 },
  centeredColumn: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", paddingHorizontal: 16, paddingBottom: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  title: { fontSize: 26, fontWeight: "800", color: "#111827", marginBottom: 16 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { flex: 1, color: "#B91C1C", fontSize: 13, fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  sectionLabel: { fontSize: 15, fontWeight: "700", color: "#111827" },
  addressList: { maxHeight: 220 },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  addressCardActive: {},
  addressRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  addressRadioDot: { width: 10, height: 10, borderRadius: 5 },
  addressLabel: { fontWeight: "700", color: "#111827" },
  addressText: { color: "#6B7280", marginTop: 2, fontSize: 13 },
  empty: { color: "#6B7280", marginBottom: 8 },
  addAddressButton: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  link: { fontWeight: "600" },
  newAddressForm: { marginTop: 12 },
  providerRow: { flexDirection: "row", gap: 10 },
  providerChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  providerChipText: { color: "#374151", fontWeight: "600" },
  providerChipTextActive: { color: "#fff" },
});
