import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { VendorOrderStatus } from "@ikaystores/shared";
import type { UpdateVendorOrderStatusInput, VendorOrderDto } from "@ikaystores/shared";
import { OrdersApi } from "../../api/endpoints";

const NEXT_STATUS: Partial<
  Record<VendorOrderStatus, VendorOrderStatus.SHIPPED | VendorOrderStatus.DELIVERED>
> = {
  [VendorOrderStatus.ACCEPTED]: VendorOrderStatus.SHIPPED,
  [VendorOrderStatus.SHIPPED]: VendorOrderStatus.DELIVERED,
};

export function VendorOrdersScreen() {
  const queryClient = useQueryClient();
  const ordersQuery = useQuery({ queryKey: ["vendorOrders"], queryFn: OrdersApi.vendorOrders });

  const advanceStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UpdateVendorOrderStatusInput["status"] }) =>
      OrdersApi.updateVendorOrderStatus(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendorOrders"] }),
  });

  if (ordersQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Incoming orders</Text>
      <FlatList
        data={ordersQuery.data ?? []}
        keyExtractor={(item: VendorOrderDto) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No orders yet.</Text>}
        renderItem={({ item }) => {
          const nextStatus = NEXT_STATUS[item.status];
          return (
            <View style={styles.card}>
              <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
              <Text style={styles.status}>Status: {item.status}</Text>
              {item.items.map((line) => (
                <Text key={line.id} style={styles.itemLine}>
                  {line.title} × {line.quantity}
                </Text>
              ))}
              <Text style={styles.payout}>
                Your payout: NGN {Number(item.vendorPayoutAmount).toLocaleString()}
              </Text>
              {nextStatus && (
                <Pressable
                  style={styles.actionButton}
                  onPress={() => advanceStatus.mutate({ id: item.id, status: nextStatus })}
                >
                  <Text style={styles.actionButtonText}>Mark as {nextStatus}</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 16 },
  empty: { textAlign: "center", marginTop: 40, color: "#6B7280" },
  card: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 14, marginBottom: 12 },
  orderId: { fontWeight: "700", color: "#111827" },
  status: { color: "#6B7280", marginTop: 2, marginBottom: 8, fontSize: 13 },
  itemLine: { color: "#374151", fontSize: 14 },
  payout: { fontWeight: "700", color: "#111827", marginTop: 8 },
  actionButton: {
    marginTop: 12,
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  actionButtonText: { color: "#fff", fontWeight: "600" },
});
