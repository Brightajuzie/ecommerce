import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { OrdersApi } from "../../api/endpoints";
import type { BuyerStackParamList } from "../../navigation/types";

export function OrderDetailScreen() {
  const route = useRoute<RouteProp<BuyerStackParamList, "OrderDetail">>();
  const orderQuery = useQuery({
    queryKey: ["order", route.params.orderId],
    queryFn: () => OrdersApi.findOne(route.params.orderId),
    refetchInterval: (query) =>
      query.state.data?.status === "PENDING_PAYMENT" ? 3000 : false,
  });

  if (orderQuery.isLoading || !orderQuery.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const order = orderQuery.data;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order #{order.id.slice(0, 8)}</Text>
      <Text style={styles.status}>Status: {order.status}</Text>
      <Text style={styles.total}>
        Total: {order.currency} {Number(order.totalAmount).toLocaleString()}
      </Text>

      <FlatList
        data={order.vendorOrders}
        keyExtractor={(vo) => vo.id}
        style={styles.list}
        renderItem={({ item: vendorOrder }) => (
          <View style={styles.vendorCard}>
            <Text style={styles.vendorStatus}>Vendor order status: {vendorOrder.status}</Text>
            {vendorOrder.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemTitle}>
                  {item.title} × {item.quantity}
                </Text>
                <Text style={styles.itemPrice}>
                  {order.currency} {(Number(item.price) * item.quantity).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "800", color: "#111827" },
  status: { fontSize: 15, color: "#6B7280", marginTop: 8 },
  total: { fontSize: 18, fontWeight: "700", color: "#111827", marginTop: 8, marginBottom: 16 },
  list: { flex: 1 },
  vendorCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  vendorStatus: { fontWeight: "700", marginBottom: 8, color: "#111827" },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  itemTitle: { color: "#374151" },
  itemPrice: { color: "#111827", fontWeight: "600" },
});
