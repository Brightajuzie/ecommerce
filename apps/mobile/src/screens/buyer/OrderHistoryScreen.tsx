import { FlatList, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { OrderDto } from "@ikaystores/shared";
import { OrdersApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import { OrderCardSkeleton } from "../../components/SkeletonLoader";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { useAuthStore } from "../../store/authStore";
import type { BuyerStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 700;

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Payment confirmed",
  FULFILLING: "In transit",
  COMPLETED: "Delivered",
  CANCELLED: "Cancelled",
  FAILED: "Payment failed",
};

export function OrderHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);

  const getStatusTokens = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "PAID":
        return { bg: theme.colors.successSubtle, fg: theme.colors.success };
      case "FULFILLING":
        return { bg: theme.colors.infoSubtle, fg: theme.colors.info };
      case "PENDING_PAYMENT":
        return { bg: theme.colors.warningSubtle, fg: theme.colors.warning };
      case "FAILED":
      case "CANCELLED":
        return { bg: theme.colors.dangerSubtle, fg: theme.colors.danger };
      default:
        return { bg: theme.colors.surfaceAlt, fg: theme.colors.textMuted };
    }
  };

  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: 50 },
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
      <View style={styles.container}>
        <View style={styles.centeredColumn}>
          <Text style={styles.title}>Your orders</Text>
          <View style={{ marginTop: 16 }}>
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </View>
        </View>
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
            <Ionicons name="receipt-outline" size={48} color={theme.colors.textFaint} />
            <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text, marginTop: 8 }}>No orders yet</Text>
            <Text style={styles.emptyText}>You haven't placed any orders yet. Start exploring fresh produce!</Text>
            <PrimaryButton
              title="Browse catalogue"
              onPress={() => navigation.navigate("BuyerTabs")}
              size="md"
              leftIcon="basket-outline"
            />
          </View>
        }
        renderItem={({ item }) => {
          const statusStyle = getStatusTokens(item.status);
          const label = STATUS_LABELS[item.status] ?? item.status;
          return (
            <View style={styles.centeredColumn}>
              <Pressable
                style={styles.card}
                onPress={() => navigation.navigate("OrderDetail", { orderId: item.id })}
                accessibilityRole="button"
                accessibilityLabel={`Order ${item.id.slice(0, 8)}, status ${label}`}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name="receipt" size={18} color={theme.primaryColor} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.orderId}>Order #{item.id.slice(0, 8).toUpperCase()}</Text>
                  <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.orderTotal}>
                    {item.currency} {Number(item.totalAmount).toLocaleString()}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusPillText, { color: statusStyle.fg }]}>{label}</Text>
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
