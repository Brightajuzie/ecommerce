import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { OrderDto } from "@ikaystores/shared";
import { OrdersApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import type { BuyerStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 700;

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  PENDING_PAYMENT: { bg: "#FEF3C7", fg: "#B45309" },
  PAID: { bg: "#DCFCE7", fg: "#15803D" },
  FAILED: { bg: "#FEE2E2", fg: "#B91C1C" },
  FULFILLING: { bg: "#DBEAFE", fg: "#1D4ED8" },
  COMPLETED: { bg: "#DCFCE7", fg: "#15803D" },
  CANCELLED: { bg: "#FEE2E2", fg: "#B91C1C" },
};

export function OrderHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: OrdersApi.myOrders,
    enabled: !!user,
  });

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.centeredColumn}>
          <Text style={styles.title}>Your orders</Text>
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={32} color="#9CA3AF" />
            <Text style={styles.emptyText}>Sign in to view your orders.</Text>
          </View>
          <PrimaryButton title="Sign in" onPress={() => navigation.navigate("Login")} />
        </View>
      </View>
    );
  }

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
        <Text style={styles.title}>Your orders</Text>
      </View>
      <FlatList
        data={ordersQuery.data ?? []}
        keyExtractor={(item: OrderDto) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={32} color="#9CA3AF" />
            <Text style={styles.emptyText}>No orders yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusStyle = STATUS_STYLES[item.status] ?? { bg: "#F3F4F6", fg: "#6B7280" };
          return (
            <View style={styles.centeredColumn}>
              <Pressable
                style={styles.card}
                onPress={() => navigation.navigate("OrderDetail", { orderId: item.id })}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name="receipt" size={18} color={theme.primaryColor} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
                  <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.orderTotal}>
                    {item.currency} {Number(item.totalAmount).toLocaleString()}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusPillText, { color: statusStyle.fg }]}>{item.status}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>
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
  title: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 16 },
  list: { paddingBottom: 24 },
  empty: { alignItems: "center", marginTop: 40, marginBottom: 20, gap: 8 },
  emptyText: { color: "#6B7280" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1 },
  orderId: { fontWeight: "700", color: "#111827", fontSize: 14 },
  orderDate: { color: "#6B7280", marginTop: 2, fontSize: 12 },
  rowRight: { alignItems: "flex-end", marginRight: 4 },
  orderTotal: { fontWeight: "800", color: "#111827", fontSize: 14 },
  statusPill: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusPillText: { fontSize: 10, fontWeight: "800" },
});
