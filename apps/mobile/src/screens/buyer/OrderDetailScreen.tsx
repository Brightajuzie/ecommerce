import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import { PaymentProvider } from "@ikaystores/shared";
import { OrdersApi, PaymentsApi } from "../../api/endpoints";
import { getErrorMessage } from "../../api/errorMessage";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
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
  const user = useAuthStore((s) => s.user);
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    scrollContent: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 24 },
    centeredColumn: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const },
    receiptCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      alignItems: "center" as const,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity + 0.01,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    receiptLabel: { fontSize: 12, fontWeight: "800" as const, color: colors.textFaint, letterSpacing: 2 },
    title: { fontSize: 22, fontWeight: "800" as const, color: colors.text, marginTop: 6 },
    date: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
    statusPill: { marginTop: 14, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
    statusPillText: { fontWeight: "800" as const, fontSize: 13 },
    retryBlock: { width: "100%" as const, marginTop: 16 },
    passwordCard: {
      width: "100%" as const,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      backgroundColor: theme.accentColor ?? colors.placeholderBg,
      borderRadius: 12,
      padding: 12,
      marginTop: 16,
    },
    passwordCardText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: "700" as const },
    errorBanner: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      backgroundColor: theme.scheme === "dark" ? "#3A1518" : "#FEF2F2",
      borderWidth: 1,
      borderColor: theme.scheme === "dark" ? "#5B2226" : "#FECACA",
      borderRadius: 8,
      padding: 10,
      marginBottom: 10,
    },
    errorBannerText: { flex: 1, color: theme.scheme === "dark" ? "#FCA5A5" : "#B91C1C", fontSize: 12, fontWeight: "600" as const },
    confirmedBanner: {
      width: "100%" as const,
      flexDirection: "row" as const,
      gap: 10,
      backgroundColor: theme.scheme === "dark" ? "#0F3D22" : "#F0FDF4",
      borderWidth: 1,
      borderColor: theme.scheme === "dark" ? "#1D6B3E" : "#BBF7D0",
      borderRadius: 12,
      padding: 14,
      marginTop: 16,
    },
    confirmedBannerText: {
      flex: 1,
      color: theme.scheme === "dark" ? "#86EFAC" : "#166534",
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "600" as const,
    },
    qrWrap: { alignItems: "center" as const, marginTop: 20 },
    qrHint: { fontSize: 12, color: colors.textFaint, marginTop: 10, textAlign: "center" as const },
    divider: { height: 1, backgroundColor: colors.border, width: "100%" as const, marginVertical: 20 },
    summaryRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      width: "100%" as const,
      marginBottom: 6,
    },
    summaryLabel: { color: colors.textMuted, fontSize: 14 },
    summaryValue: { color: colors.text, fontSize: 14, fontWeight: "600" as const },
    total: { fontSize: 18, fontWeight: "800" as const, color: colors.text },
    vendorCard: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    vendorStatus: { fontWeight: "700" as const, marginBottom: 8, color: colors.text },
    itemRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, paddingVertical: 4 },
    itemTitle: { color: colors.textSecondary },
    itemPrice: { color: colors.text, fontWeight: "600" as const },
  }));
  const statusColors =
    theme.scheme === "dark"
      ? { paid: "#0F3D22", pending: "#3F2D07", paidFg: "#4ADE80", pendingFg: "#FBBF24" }
      : { paid: "#DCFCE7", pending: "#FEF3C7", paidFg: "#15803D", pendingFg: "#B45309" };
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
      // Always present for a FLUTTERWAVE initiate (only COD omits it) — the
      // check just satisfies the now-optional type, not a real runtime case.
      if (payment.checkoutUrl) {
        navigation.navigate("PaymentWebView", { checkoutUrl: payment.checkoutUrl, orderId: route.params.orderId });
      }
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
  const isCod = order.paymentProvider === PaymentProvider.COD;
  // PAID means "confirmed, fulfillment can proceed" for a COD order too
  // (see PaymentsService.initiateCod) — the wallet/vendor-payout money
  // itself isn't actually collected until delivery either way (see
  // OrdersService.updateVendorOrderStatus), so this is a label-only
  // distinction: don't tell a COD buyer they've already paid.
  const statusLabel =
    isPaid && isCod ? "Confirmed — pay on delivery" : (STATUS_LABELS[order.status] ?? order.status);
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
                { backgroundColor: isPaid ? statusColors.paid : statusColors.pending },
              ]}
            >
              <Text style={[styles.statusPillText, { color: isPaid ? statusColors.paidFg : statusColors.pendingFg }]}>
                {statusLabel}
              </Text>
            </View>

            {/* Same message PaymentsService.notifyOrderConfirmed() logs to the
                buyer's Notifications feed and emails them — shown here too
                since this screen is exactly where they land right after
                paying (or confirming pay-on-delivery), the moment it's most
                useful to see it. */}
            {isPaid && (
              <View style={styles.confirmedBanner}>
                <Ionicons name="bicycle" size={20} color={theme.scheme === "dark" ? "#86EFAC" : "#166534"} />
                <Text style={styles.confirmedBannerText}>
                  Your order will be delivered within a few hours. A rider will call you shortly to
                  confirm your delivery location.
                </Text>
              </View>
            )}

            {isPaid && user?.hasPassword === false && (
              <Pressable style={styles.passwordCard} onPress={() => navigation.navigate("SetPassword")}>
                <Ionicons name="key" size={18} color={theme.primaryColor} />
                <Text style={styles.passwordCardText}>
                  Set a password to save your order history for next time
                </Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
              </Pressable>
            )}

            {order.status === "PENDING_PAYMENT" && (
              <View style={styles.retryBlock}>
                {retryPayment.isError && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={16} color={theme.colors.danger} />
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
              {/* The QR code itself stays fixed dark-on-white regardless of
                  app theme — scanners need real contrast, and an inverted
                  (light-on-dark) QR image is unreliable to scan. */}
              <QRCode value={`IKAYSTORES:ORDER:${order.id}`} size={160} color="#111827" backgroundColor="#fff" />
              <Text style={styles.qrHint}>Scan at pickup or for order verification</Text>
            </View>

            <View style={styles.divider} />

            {order.deliveryFee > 0 && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>
                    {order.currency} {(Number(order.totalAmount) - Number(order.deliveryFee)).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Delivery fee</Text>
                  <Text style={styles.summaryValue}>
                    {order.currency} {Number(order.deliveryFee).toLocaleString()}
                  </Text>
                </View>
              </>
            )}
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
