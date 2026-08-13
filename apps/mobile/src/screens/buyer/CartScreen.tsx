import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { CartItemDto } from "@ikaystores/shared";
import { CartApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { useGuestCartStore } from "../../store/guestCartStore";
import { optimizedImageUrl } from "../../utils/image";
import type { BuyerStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 700;

export function CartScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const guestItems = useGuestCartStore((s) => s.items);
  const guestUpdateItem = useGuestCartStore((s) => s.updateItem);
  const guestRemoveItem = useGuestCartStore((s) => s.removeItem);

  const cartQuery = useQuery({ queryKey: ["cart"], queryFn: CartApi.get, enabled: !!user });

  const updateItem = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      CartApi.updateItem(itemId, { quantity }),
    onSuccess: (data) => queryClient.setQueryData(["cart"], data),
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) => CartApi.removeItem(itemId),
    onSuccess: (data) => queryClient.setQueryData(["cart"], data),
  });

  const handleUpdate = (item: CartItemDto, quantity: number) => {
    if (user) {
      updateItem.mutate({ itemId: item.id, quantity });
    } else {
      guestUpdateItem(item.productId, quantity);
    }
  };

  const handleRemove = (item: CartItemDto) => {
    if (user) {
      removeItem.mutate(item.id);
    } else {
      guestRemoveItem(item.productId);
    }
  };

  if (user && (cartQuery.isLoading || !cartQuery.data)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primaryColor} />
      </View>
    );
  }

  const items = user ? (cartQuery.data?.items ?? []) : guestItems;
  const total = items.reduce((sum, item) => sum + Number(item.priceAtAdd) * item.quantity, 0);

  return (
    <View style={styles.container}>
      <View style={styles.centeredColumn}>
        <Text style={styles.title}>Your cart</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item: CartItemDto) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={36} color="#9CA3AF" />
            <Text style={styles.emptyText}>Your cart is empty.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.centeredColumn}>
            <View style={styles.card}>
              <Image source={{ uri: optimizedImageUrl(item.product.images[0], 150) }} style={styles.image} />
              <View style={styles.rowBody}>
                <Text numberOfLines={1} style={styles.itemTitle}>
                  {item.product.title}
                </Text>
                <Text style={[styles.itemPrice, { color: theme.primaryColor }]}>
                  {item.product.currency} {Number(item.priceAtAdd).toLocaleString()}
                </Text>
                <View style={styles.actionsRow}>
                  <View style={styles.stepper}>
                    <Pressable
                      style={styles.stepperButton}
                      onPress={() => handleUpdate(item, Math.max(1, item.quantity - 1))}
                    >
                      <Ionicons name="remove" size={16} color="#111827" />
                    </Pressable>
                    <Text style={styles.stepperValue}>{item.quantity}</Text>
                    <Pressable
                      style={styles.stepperButton}
                      onPress={() => handleUpdate(item, item.quantity + 1)}
                    >
                      <Ionicons name="add" size={16} color="#111827" />
                    </Pressable>
                  </View>
                  <Pressable onPress={() => handleRemove(item)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}
      />

      {items.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.centeredColumn}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {items[0].product.currency} {total.toLocaleString()}
              </Text>
            </View>
            <PrimaryButton
              title="Checkout"
              onPress={() =>
                user
                  ? navigation.navigate("Checkout")
                  : navigation.navigate("Login", { redirectTo: "Checkout" })
              }
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", paddingTop: 60 },
  centeredColumn: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", paddingHorizontal: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 16 },
  list: { paddingBottom: 20 },
  empty: { alignItems: "center", marginTop: 60, gap: 8 },
  emptyText: { color: "#6B7280" },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  image: { width: 72, height: 72, borderRadius: 10, backgroundColor: "#F0FDF4" },
  rowBody: { flex: 1, marginLeft: 12, justifyContent: "center" },
  itemTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  itemPrice: { fontSize: 14, fontWeight: "800", marginTop: 3 },
  actionsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 3,
  },
  stepperButton: { width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 6 },
  stepperValue: { fontSize: 14, fontWeight: "700", color: "#111827", minWidth: 24, textAlign: "center" },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#fff",
    paddingTop: 16,
    paddingBottom: 24,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 },
  totalLabel: { fontSize: 14, color: "#6B7280", fontWeight: "600" },
  totalValue: { fontSize: 20, fontWeight: "800", color: "#111827" },
});
