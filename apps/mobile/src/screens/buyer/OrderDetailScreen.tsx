import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import { PaymentProvider } from "@ikaystores/shared";
import { OrdersApi, PaymentsApi } from "../../api/endpoints";
import { getErrorMessage } from "../../api/errorMessage";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import type { BuyerStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 700;

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pending payment",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export function OrderDetailScreen() {
  const route = useRoute<RouteProp<BuyerStackParamList, "OrderDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const theme = useTheme();
  const orderQuery = useQuery({
    queryKey: ["order", route.params.orderId],
    queryFn: () => OrdersApi.findOne(route.params.orderId),
    refetchInterval: (query) =>
      query.state.data?.status === "PENDING_PAYMENT" ? 3000 : false,
  });

  // A payment that fails or is abandoned mid-flow (e.g. the gateway
  // redirect never completes) leaves the order sitting in
  // PENDING_PAYMENT with no other way to finish it — the backend already
  // allows re-calling /payments/initiate for any order still in that
  // status, this just exposes it in the UI.
  const retryPayment = useMutation({
    mutationFn: () =>
      PaymentsApi.initiate({ orderId: route.params.orderId, provider: PaymentProvider.FLUTTERWAVE }),
    onSuccess: (payment) => {
      navigation.navigate("PaymentWebView", { checkoutUrl: payment.checkoutUrl, orderId: route.params.orderId });
    },
  });

  if (orderQuery.isLoading || !orderQuery.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primaryColor} />
      </View>
    );
  }

  const order = orderQuery.data;
  const isPaid = order.status === "PAID";
  const orderDate = new Date(order.createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      data={order.vendorOrders}
      keyExtractor={(vo) => vo.id}
      ListHeaderComponent={
        <View style={styles.centeredColumn}>
          <View style={styles.receiptCard}>
            <Text style={styles.receiptLabel}>RECEIPT</Text>
            <Text style={styles.title}>Order #{order.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={styles.date}>{orderDate}</Text>

            <View
              style={[
                styles.statusPill,
                { backgroundColor: isPaid ? "#DCFCE7" : "#FEF3C7" },
              ]}
            >
              <Text style={[styles.statusPillText, { color: isPaid ? "#15803D" : "#B45309" }]}>
                {STATUS_LABELS[order.status] ?? order.status}
              </Text>
            </View>

            {order.status === "PENDING_PAYMENT" && (
              <View style={styles.retryBlock}>
                {retryPayment.isError && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={styles.errorBannerText}>
                      {getErrorMessage(retryPayment.error, "Could not start payment. Please try again.")}
                    </Text>
                  </View>
                )}
                <PrimaryButton
                  title="Complete payment"
                  onPress={() => retryPayment.mutate()}
                  loading={retryPayment.isPending}
                />
              </View>
            )}

            <View style={styles.qrWrap}>
              <QRCode value={`IKAYSTORES:ORDER:${order.id}`} size={160} color="#111827" backgroundColor="#fff" />
              <Text style={styles.qrHint}>Scan at pickup or for order verification</Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.total}>
              Total: {order.currency} {Number(order.totalAmount).toLocaleString()}
            </Text>
          </View>
        </View>
      }
      renderItem={({ item: vendorOrder }) => (
        <View style={styles.centeredColumn}>
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
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 24 },
  centeredColumn: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
  receiptCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  receiptLabel: { fontSize: 12, fontWeight: "800", color: "#9CA3AF", letterSpacing: 2 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827", marginTop: 6 },
  date: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  statusPill: { marginTop: 14, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  statusPillText: { fontWeight: "800", fontSize: 13 },
  retryBlock: { width: "100%", marginTop: 16 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  errorBannerText: { flex: 1, color: "#B91C1C", fontSize: 12, fontWeight: "600" },
  qrWrap: { alignItems: "center", marginTop: 20 },
  qrHint: { fontSize: 12, color: "#9CA3AF", marginTop: 10, textAlign: "center" },
  divider: { height: 1, backgroundColor: "#E5E7EB", width: "100%", marginVertical: 20 },
  total: { fontSize: 18, fontWeight: "800", color: "#111827" },
  vendorCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  vendorStatus: { fontWeight: "700", marginBottom: 8, color: "#111827" },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  itemTitle: { color: "#374151" },
  itemPrice: { color: "#111827", fontWeight: "600" },
});
