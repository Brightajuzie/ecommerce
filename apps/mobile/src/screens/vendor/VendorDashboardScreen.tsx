import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { ProductStatus, VendorOrderStatus } from "@ikaystores/shared";
import { OrdersApi, ProductsApi, UsersApi, VendorsApi, WalletApi } from "../../api/endpoints";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { VendorStackParamList, VendorTabParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 900;

type VendorDashboardNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<VendorTabParamList>,
  NativeStackNavigationProp<VendorStackParamList>
>;

export function VendorDashboardScreen() {
  const navigation = useNavigation<VendorDashboardNavigationProp>();
  const theme = useTheme();

  const meQuery = useQuery({ queryKey: ["me"], queryFn: UsersApi.me });
  const vendorQuery = useQuery({ queryKey: ["vendorMe"], queryFn: VendorsApi.me });
  const productsQuery = useQuery({ queryKey: ["myProducts"], queryFn: ProductsApi.listMine });
  const ordersQuery = useQuery({ queryKey: ["vendorOrders"], queryFn: OrdersApi.vendorOrders });
  const walletQuery = useQuery({ queryKey: ["myWallet"], queryFn: WalletApi.me });

  const isLoading =
    meQuery.isLoading || vendorQuery.isLoading || productsQuery.isLoading || ordersQuery.isLoading || walletQuery.isLoading;

  const stats = useMemo(() => {
    const products = productsQuery.data ?? [];
    const orders = ordersQuery.data ?? [];
    return {
      productCount: products.length,
      activeProductCount: products.filter((p) => p.status === ProductStatus.ACTIVE).length,
      pendingOrderCount: orders.filter((o) => o.status === VendorOrderStatus.PENDING).length,
      inFlightOrderCount: orders.filter((o) =>
        [VendorOrderStatus.ACCEPTED, VendorOrderStatus.SHIPPED].includes(o.status),
      ).length,
    };
  }, [productsQuery.data, ordersQuery.data]);

  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingTop: 60, paddingBottom: 32 },
    centeredColumn: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const, paddingHorizontal: 16 },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    greeting: { fontSize: 14, color: colors.textMuted, fontWeight: "600" as const },
    title: { fontSize: 28, fontWeight: "800" as const, color: colors.text, marginBottom: 18 },
    balanceCard: {
      borderRadius: 20,
      padding: 22,
      marginBottom: 18,
      shadowColor: "#000",
      shadowOpacity: 0.14,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    balanceTopRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "flex-start" as const },
    balanceLabel: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "600" as const },
    balanceAmount: { color: "#fff", fontSize: 32, fontWeight: "800" as const, marginTop: 4 },
    balanceLink: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      backgroundColor: "rgba(255,255,255,0.18)",
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
    },
    balanceLinkText: { color: "#fff", fontSize: 12, fontWeight: "700" as const },
    identityBanner: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      backgroundColor: "rgba(255,255,255,0.14)",
      borderRadius: 12,
      padding: 10,
      marginTop: 16,
    },
    identityBannerText: { color: "#fff", fontSize: 12, fontWeight: "600" as const, flex: 1 },
    statsGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 12, marginBottom: 18 },
    statCard: {
      flexGrow: 1,
      flexBasis: 150,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity + 0.01,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    statIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: 10,
    },
    statValue: { fontSize: 24, fontWeight: "800" as const, color: colors.text },
    statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: "600" as const },
    sectionLabel: { fontSize: 15, fontWeight: "700" as const, color: colors.text, marginBottom: 10 },
    quickActionsRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 10 },
    quickAction: {
      flexGrow: 1,
      flexBasis: 150,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    quickActionIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: theme.accentColor ?? colors.placeholderBg,
    },
    quickActionText: { fontSize: 13, fontWeight: "700" as const, color: colors.text, flexShrink: 1 },
  }));

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primaryColor} />
      </View>
    );
  }

  const businessName = vendorQuery.data?.businessName;
  const identityVerified = meQuery.data?.identityVerified;
  const livenessVerified = meQuery.data?.livenessVerified;
  // Both checks are optional at signup (see VendorPendingScreen's "Skip for
  // now") so we don't nag from day one — only remind once a vendor has some
  // real listings up and buyer trust starts to matter.
  const showVerificationReminder = stats.productCount >= 5 && (!identityVerified || !livenessVerified);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.centeredColumn}>
        {businessName && <Text style={styles.greeting}>Welcome back</Text>}
        <Text style={styles.title}>{businessName ?? "Dashboard"}</Text>

        <Pressable style={[styles.balanceCard, { backgroundColor: theme.primaryColor }]} onPress={() => navigation.navigate("Wallet")}>
          <View style={styles.balanceTopRow}>
            <View>
              <Text style={styles.balanceLabel}>Wallet balance</Text>
              <Text style={styles.balanceAmount}>
                NGN {Number(walletQuery.data?.balance ?? 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.balanceLink}>
              <Text style={styles.balanceLinkText}>View wallet</Text>
              <Ionicons name="arrow-forward" size={12} color="#fff" />
            </View>
          </View>

          {showVerificationReminder && (
            <Pressable
              style={styles.identityBanner}
              onPress={() =>
                navigation.navigate(!identityVerified ? "IdentityVerification" : "LivenessCheck")
              }
            >
              <Ionicons name="shield-outline" size={18} color="#fff" />
              <Text style={styles.identityBannerText}>
                {!identityVerified && !livenessVerified
                  ? "You've listed 5+ products — verify your identity and take a liveness selfie to build buyer trust"
                  : !identityVerified
                    ? "You've listed 5+ products — verify your identity to build buyer trust"
                    : "You've listed 5+ products — take a quick liveness selfie to build buyer trust"}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </Pressable>
          )}
        </Pressable>

        <View style={styles.statsGrid}>
          <Pressable style={styles.statCard} onPress={() => navigation.navigate("MyProducts")}>
            <View style={[styles.statIconWrap, { backgroundColor: theme.accentColor ?? theme.colors.placeholderBg }]}>
              <Ionicons name="cube" size={18} color={theme.primaryColor} />
            </View>
            <Text style={styles.statValue}>{stats.productCount}</Text>
            <Text style={styles.statLabel}>{stats.activeProductCount} active products</Text>
          </Pressable>

          <Pressable style={styles.statCard} onPress={() => navigation.navigate("VendorOrders")}>
            <View style={[styles.statIconWrap, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="time" size={18} color="#B45309" />
            </View>
            <Text style={styles.statValue}>{stats.pendingOrderCount}</Text>
            <Text style={styles.statLabel}>Orders awaiting action</Text>
          </Pressable>

          <Pressable style={styles.statCard} onPress={() => navigation.navigate("VendorOrders")}>
            <View style={[styles.statIconWrap, { backgroundColor: "#DBEAFE" }]}>
              <Ionicons name="bicycle" size={18} color="#1D4ED8" />
            </View>
            <Text style={styles.statValue}>{stats.inFlightOrderCount}</Text>
            <Text style={styles.statLabel}>Orders in progress</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Quick actions</Text>
        <View style={styles.quickActionsRow}>
          <Pressable style={styles.quickAction} onPress={() => navigation.navigate("ProductForm", undefined)}>
            <View style={styles.quickActionIconWrap}>
              <Ionicons name="add" size={18} color={theme.primaryColor} />
            </View>
            <Text style={styles.quickActionText}>Add product</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => navigation.navigate("VendorOrders")}>
            <View style={styles.quickActionIconWrap}>
              <Ionicons name="receipt" size={18} color={theme.primaryColor} />
            </View>
            <Text style={styles.quickActionText}>View orders</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => navigation.navigate("Wallet")}>
            <View style={styles.quickActionIconWrap}>
              <Ionicons name="wallet" size={18} color={theme.primaryColor} />
            </View>
            <Text style={styles.quickActionText}>Wallet</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
