import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CartItemDto } from "@ikstore/shared";
import { CartApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import type { BuyerStackParamList } from "../../navigation/types";

export function CartScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const queryClient = useQueryClient();

  const cartQuery = useQuery({ queryKey: ["cart"], queryFn: CartApi.get });

  const updateItem = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      CartApi.updateItem(itemId, { quantity }),
    onSuccess: (data) => queryClient.setQueryData(["cart"], data),
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) => CartApi.removeItem(itemId),
    onSuccess: (data) => queryClient.setQueryData(["cart"], data),
  });

  if (cartQuery.isLoading || !cartQuery.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const items = cartQuery.data.items;
  const total = items.reduce((sum, item) => sum + Number(item.priceAtAdd) * item.quantity, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your cart</Text>
      <FlatList
        data={items}
        keyExtractor={(item: CartItemDto) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Your cart is empty.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Image source={{ uri: item.product.images[0] }} style={styles.image} />
            <View style={styles.rowBody}>
              <Text numberOfLines={1} style={styles.itemTitle}>
                {item.product.title}
              </Text>
              <Text style={styles.itemPrice}>
                {item.product.currency} {Number(item.priceAtAdd).toLocaleString()} × {item.quantity}
              </Text>
              <View style={styles.actionsRow}>
                <Text
                  style={styles.actionText}
                  onPress={() =>
                    updateItem.mutate({ itemId: item.id, quantity: Math.max(1, item.quantity - 1) })
                  }
                >
                  −
                </Text>
                <Text style={styles.actionQuantity}>{item.quantity}</Text>
                <Text
                  style={styles.actionText}
                  onPress={() => updateItem.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                >
                  +
                </Text>
                <Text style={styles.removeText} onPress={() => removeItem.mutate(item.id)}>
                  Remove
                </Text>
              </View>
            </View>
          </View>
        )}
      />

      {items.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.totalText}>
            Total: {items[0].product.currency} {total.toLocaleString()}
          </Text>
          <PrimaryButton title="Checkout" onPress={() => navigation.navigate("Checkout")} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 16 },
  list: { paddingBottom: 20 },
  empty: { textAlign: "center", marginTop: 40, color: "#6B7280" },
  row: { flexDirection: "row", marginBottom: 16 },
  image: { width: 70, height: 70, borderRadius: 8, backgroundColor: "#E5E7EB" },
  rowBody: { flex: 1, marginLeft: 12, justifyContent: "center" },
  itemTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  itemPrice: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  actionsRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 12 },
  actionText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    paddingHorizontal: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
  },
  actionQuantity: { fontSize: 15, fontWeight: "600" },
  removeText: { fontSize: 13, color: "#DC2626", marginLeft: "auto" },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 16,
    paddingBottom: 24,
  },
  totalText: { fontSize: 18, fontWeight: "700", marginBottom: 12, color: "#111827" },
});
