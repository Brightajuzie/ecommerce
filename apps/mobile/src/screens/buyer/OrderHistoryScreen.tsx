import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { OrderDto } from "@ikaystores/shared";
import { OrdersApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { useAuthStore } from "../../store/authStore";
import type { BuyerStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 700;

const STATUS_STYLES_LIGHT: Record<string, { bg: string; fg: string }> = {
  PENDING_PAYMENT: { bg: "#FEF3C7", fg: "#B45309" },
  PAID: { bg: "#DCFCE7", fg: "#15803D" },
  FAILED: { bg: "#FEE2E2", fg: "#B91C1C" },
  FULFILLING: { bg: "#DBEAFE", fg: "#1D4ED8" },
  COMPLETED: { bg: "#DCFCE7", fg: "#15803D" },
  CANCELLED: { bg: "#FEE2E2", fg: "#B91C1C" },
};

const STATUS_STYLES_DARK: Record<string, { bg: string; fg: string }> = {
  PENDING_PAYMENT: { bg: "#3F2D07", fg: "#FBBF24" },
  PAID: { bg: "#0F3D22", fg: "#4ADE80" },
  FAILED: { bg: "#450A0A", fg: "#F87171" },
  FULFILLING: { bg: "#132A47", fg: "#60A5FA" },
  COMPLETED: { bg: "#0F3D22", fg: "#4ADE80" },
  CANCELLED: { bg: "#450A0A", fg: "#F87171" },
};

export function OrderHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const statusStyles = theme.scheme === "dark" ? STATUS_STYLES_DARK : STATUS_STYLES_LIGHT;
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
    centeredColumn: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const, paddingHorizontal: 16 },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    title: { fontSize: 28, fontWeight: "800" as const, color: colors.text, marginBottom: 16 },
    list: { paddingBottom: 24 },
    empty: { alignItems: "center" as const, marginTop: 40, marginBottom: 20, gap: 8 },
    emptyText: { color: colors.textMuted },
    card: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.placeholderBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    rowBody: { flex: 1 },
    orderId: { fontWeight: "700" as const, color: colors.text, fontSize: 14 },
    orderDate: { color: colors.textMuted, marginTop: 2, fontSize: 12 },
    rowRight: { alignItems: "flex-end" as const, marginRight: 4 },
    orderTotal: { fontWeight: "800" as const, color: colors.text, fontSize: 14 },
    statusPill: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    statusPillText: { fontSize: 10, fontWeight: "800" as const },
  }));
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
            <Ionicons name="receipt-outline" size={32} color={theme.colors.textFaint} />
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
            <Ionicons name="receipt-outline" size={32} color={theme.colors.textFaint} />
            <Text style={styles.emptyText}>No orders yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusStyle = statusStyles[item.status] ?? { bg: theme.colors.surfaceAlt, fg: theme.colors.textMuted };
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
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textFaint} />
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}
