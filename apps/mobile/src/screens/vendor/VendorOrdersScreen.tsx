import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { VendorOrderStatus } from "@ikaystores/shared";
import type { UpdateVendorOrderStatusInput, VendorOrderDto } from "@ikaystores/shared";
import { OrdersApi } from "../../api/endpoints";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";

const MAX_CONTENT_WIDTH = 700;

const NEXT_STATUS: Partial<
  Record<VendorOrderStatus, VendorOrderStatus.SHIPPED | VendorOrderStatus.DELIVERED>
> = {
  [VendorOrderStatus.ACCEPTED]: VendorOrderStatus.SHIPPED,
  [VendorOrderStatus.SHIPPED]: VendorOrderStatus.DELIVERED,
};

const STATUS_STYLES_LIGHT: Record<VendorOrderStatus, { bg: string; fg: string }> = {
  [VendorOrderStatus.PENDING]: { bg: "#FEF3C7", fg: "#B45309" },
  [VendorOrderStatus.ACCEPTED]: { bg: "#DBEAFE", fg: "#1D4ED8" },
  [VendorOrderStatus.SHIPPED]: { bg: "#EDE9FE", fg: "#6D28D9" },
  [VendorOrderStatus.DELIVERED]: { bg: "#DCFCE7", fg: "#15803D" },
  [VendorOrderStatus.CANCELLED]: { bg: "#FEE2E2", fg: "#B91C1C" },
};

const STATUS_STYLES_DARK: Record<VendorOrderStatus, { bg: string; fg: string }> = {
  [VendorOrderStatus.PENDING]: { bg: "#3F2D07", fg: "#FBBF24" },
  [VendorOrderStatus.ACCEPTED]: { bg: "#132A47", fg: "#60A5FA" },
  [VendorOrderStatus.SHIPPED]: { bg: "#2C1B4D", fg: "#A78BFA" },
  [VendorOrderStatus.DELIVERED]: { bg: "#0F3D22", fg: "#4ADE80" },
  [VendorOrderStatus.CANCELLED]: { bg: "#450A0A", fg: "#F87171" },
};

export function VendorOrdersScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const statusStyles = theme.scheme === "dark" ? STATUS_STYLES_DARK : STATUS_STYLES_LIGHT;
  const ordersQuery = useQuery({ queryKey: ["vendorOrders"], queryFn: OrdersApi.vendorOrders });
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
    centeredColumn: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const, paddingHorizontal: 16 },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    title: { fontSize: 26, fontWeight: "800" as const, color: colors.text, marginBottom: 16 },
    list: { paddingBottom: 24 },
    empty: { alignItems: "center" as const, marginTop: 60, gap: 8 },
    emptyText: { color: colors.textMuted },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    cardHeader: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 10 },
    orderId: { fontWeight: "700" as const, color: colors.text, fontSize: 15 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusPillText: { fontSize: 11, fontWeight: "800" as const, textTransform: "uppercase" as const },
    itemLine: { color: colors.textSecondary, fontSize: 14, marginBottom: 2 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
    payout: { fontWeight: "800" as const, fontSize: 15 },
    actionButton: {
      marginTop: 12,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center" as const,
    },
    actionButtonText: { color: "#fff", fontWeight: "700" as const },
  }));

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
            <Ionicons name="receipt-outline" size={32} color={theme.colors.textFaint} />
            <Text style={styles.emptyText}>No orders yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const nextStatus = NEXT_STATUS[item.status];
          const statusStyle = statusStyles[item.status];
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
