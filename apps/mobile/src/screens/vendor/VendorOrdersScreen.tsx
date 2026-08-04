import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { VendorOrderStatus } from "@ikaystores/shared";
import type { UpdateVendorOrderStatusInput, VendorOrderDto } from "@ikaystores/shared";
import { OrdersApi } from "../../api/endpoints";
import { useTheme } from "../../theme/ThemeContext";

const MAX_CONTENT_WIDTH = 700;

const NEXT_STATUS: Partial<
  Record<VendorOrderStatus, VendorOrderStatus.SHIPPED | VendorOrderStatus.DELIVERED>
> = {
  [VendorOrderStatus.ACCEPTED]: VendorOrderStatus.SHIPPED,
  [VendorOrderStatus.SHIPPED]: VendorOrderStatus.DELIVERED,
};

const STATUS_STYLES: Record<VendorOrderStatus, { bg: string; fg: string }> = {
  [VendorOrderStatus.PENDING]: { bg: "#FEF3C7", fg: "#B45309" },
  [VendorOrderStatus.ACCEPTED]: { bg: "#DBEAFE", fg: "#1D4ED8" },
  [VendorOrderStatus.SHIPPED]: { bg: "#EDE9FE", fg: "#6D28D9" },
  [VendorOrderStatus.DELIVERED]: { bg: "#DCFCE7", fg: "#15803D" },
  [VendorOrderStatus.CANCELLED]: { bg: "#FEE2E2", fg: "#B91C1C" },
};

export function VendorOrdersScreen() {
  const theme = useTheme();
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
        <ActivityIndicator color={theme.primaryColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.centeredColumn}>
        <Text style={styles.title}>Incoming orders</Text>
      </View>
      <FlatList
        data={ordersQuery.data ?? []}
        keyExtractor={(item: VendorOrderDto) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={32} color="#9CA3AF" />
            <Text style={styles.emptyText}>No orders yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const nextStatus = NEXT_STATUS[item.status];
          const statusStyle = STATUS_STYLES[item.status];
          return (
            <View style={styles.centeredColumn}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
                  <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusPillText, { color: statusStyle.fg }]}>{item.status}</Text>
                  </View>
                </View>
                {item.items.map((line) => (
                  <Text key={line.id} style={styles.itemLine}>
                    {line.title} × {line.quantity}
                  </Text>
                ))}
                <View style={styles.divider} />
                <Text style={[styles.payout, { color: theme.primaryColor }]}>
                  Your payout: NGN {Number(item.vendorPayoutAmount).toLocaleString()}
                </Text>
                {nextStatus && (
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: theme.primaryColor }]}
                    onPress={() => advanceStatus.mutate({ id: item.id, status: nextStatus })}
                  >
                    <Text style={styles.actionButtonText}>Mark as {nextStatus}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", paddingTop: 60 },
  centeredColumn: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", paddingHorizontal: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "800", color: "#111827", marginBottom: 16 },
  list: { paddingBottom: 24 },
  empty: { alignItems: "center", marginTop: 60, gap: 8 },
  emptyText: { color: "#6B7280" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  orderId: { fontWeight: "700", color: "#111827", fontSize: 15 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  itemLine: { color: "#374151", fontSize: 14, marginBottom: 2 },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 10 },
  payout: { fontWeight: "800", fontSize: 15 },
  actionButton: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionButtonText: { color: "#fff", fontWeight: "700" },
});
