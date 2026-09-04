import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { UserRole } from "@ikaystores/shared";
import { AdminProductsApi, AdminUsersApi, NotificationsApi, VendorsApi, WalletApi } from "../../api/endpoints";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { useAuthStore } from "../../store/authStore";
import type { AdminStackParamList, AdminTabParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 1000;

type AdminDashboardNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AdminTabParamList>,
  NativeStackNavigationProp<AdminStackParamList>
>;

export function AdminDashboardScreen() {
  const navigation = useNavigation<AdminDashboardNavigationProp>();
  const theme = useTheme();
  const isSuperAdmin = useAuthStore((s) => s.user?.role === UserRole.SUPER_ADMIN);

  const productsQuery = useQuery({
    queryKey: ["adminDashboardProducts"],
    queryFn: () => AdminProductsApi.browse({ pageSize: 1 }),
  });
  const usersQuery = useQuery({
    queryKey: ["adminDashboardUsers"],
    queryFn: () => AdminUsersApi.list({ pageSize: 1 }),
  });
  // Vendors are auto-approved on signup (see AuthService.register), so a raw
  // vendor count is more useful here than a "pending review" count, which
  // would now sit at 0 through every normal app flow.
  const vendorsQuery = useQuery({ queryKey: ["allVendors"], queryFn: VendorsApi.listAll });
  const pendingWithdrawalsQuery = useQuery({
    queryKey: ["pendingWithdrawals"],
    queryFn: WalletApi.pendingWithdrawals,
  });
  const platformWalletQuery = useQuery({
    queryKey: ["platformWallet"],
    queryFn: WalletApi.platform,
    enabled: isSuperAdmin,
  });
  const unreadNotificationsQuery = useQuery({
    queryKey: ["adminNotificationsUnreadCount"],
    queryFn: NotificationsApi.unreadCountForAdmin,
    refetchInterval: 15000,
  });

  const isLoading =
    productsQuery.isLoading || usersQuery.isLoading || vendorsQuery.isLoading || pendingWithdrawalsQuery.isLoading;

  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingTop: 60, paddingBottom: 32 },
    centeredColumn: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const, paddingHorizontal: 16 },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    greeting: { fontSize: 14, color: colors.textMuted, fontWeight: "600" as const },
    titleRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginBottom: 18,
    },
    title: { fontSize: 28, fontWeight: "800" as const, color: colors.text },
    bellButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    bellDot: {
      position: "absolute" as const,
      top: 8,
      right: 8,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: theme.colors.danger,
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    walletCard: {
      borderRadius: 20,
      padding: 22,
      marginBottom: 18,
      shadowColor: "#000",
      shadowOpacity: 0.14,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    walletLabel: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "600" as const },
    walletAmount: { color: "#fff", fontSize: 32, fontWeight: "800" as const, marginTop: 4 },
    walletHint: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 10 },
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
    statAlertValue: { color: theme.colors.danger },
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

  const vendorCount = vendorsQuery.data?.length ?? 0;
  const pendingWithdrawalCount = pendingWithdrawalsQuery.data?.length ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.centeredColumn}>
        <Text style={styles.greeting}>Overview</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Pressable style={styles.bellButton} onPress={() => navigation.navigate("Notifications")}>
            <Ionicons name="notifications" size={20} color={theme.colors.text} />
            {(unreadNotificationsQuery.data ?? 0) > 0 && <View style={styles.bellDot} />}
          </Pressable>
        </View>

        {isSuperAdmin && (
          <Pressable
            style={[styles.walletCard, { backgroundColor: theme.primaryColor }]}
            onPress={() => navigation.navigate("Payments")}
          >
            <Text style={styles.walletLabel}>Platform wallet balance</Text>
            <Text style={styles.walletAmount}>
              NGN {Number(platformWalletQuery.data?.balance ?? 0).toLocaleString()}
            </Text>
            <Text style={styles.walletHint}>Company + developer + super-admin revenue, held in-app</Text>
          </Pressable>
        )}

        <View style={styles.statsGrid}>
          <Pressable style={styles.statCard} onPress={() => navigation.navigate("PendingVendors")}>
            <View style={[styles.statIconWrap, { backgroundColor: "#EDE9FE" }]}>
              <Ionicons name="storefront" size={18} color="#6D28D9" />
            </View>
            <Text style={styles.statValue}>{vendorCount}</Text>
            <Text style={styles.statLabel}>Total vendors</Text>
          </Pressable>

          <Pressable style={styles.statCard} onPress={() => navigation.navigate("Users")}>
            <View style={[styles.statIconWrap, { backgroundColor: "#DBEAFE" }]}>
              <Ionicons name="people" size={18} color="#1D4ED8" />
            </View>
            <Text style={styles.statValue}>{usersQuery.data?.total ?? 0}</Text>
            <Text style={styles.statLabel}>Total buyers &amp; vendors</Text>
          </Pressable>

          <Pressable style={styles.statCard} onPress={() => navigation.navigate("Products")}>
            <View style={[styles.statIconWrap, { backgroundColor: theme.accentColor ?? theme.colors.placeholderBg }]}>
              <Ionicons name="cube" size={18} color={theme.primaryColor} />
            </View>
            <Text style={styles.statValue}>{productsQuery.data?.total ?? 0}</Text>
            <Text style={styles.statLabel}>Products listed store-wide</Text>
          </Pressable>

          <Pressable style={styles.statCard} onPress={() => navigation.navigate("Withdrawals")}>
            <View style={[styles.statIconWrap, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="cash" size={18} color="#B45309" />
            </View>
            <Text style={[styles.statValue, pendingWithdrawalCount > 0 && styles.statAlertValue]}>
              {pendingWithdrawalCount}
            </Text>
            <Text style={styles.statLabel}>Withdrawals awaiting approval</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Quick actions</Text>
        <View style={styles.quickActionsRow}>
          <Pressable style={styles.quickAction} onPress={() => navigation.navigate("PendingVendors")}>
            <View style={styles.quickActionIconWrap}>
              <Ionicons name="checkmark-done" size={18} color={theme.primaryColor} />
            </View>
            <Text style={styles.quickActionText}>Manage vendors</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => navigation.navigate("UserForm", undefined)}>
            <View style={styles.quickActionIconWrap}>
              <Ionicons name="person-add" size={18} color={theme.primaryColor} />
            </View>
            <Text style={styles.quickActionText}>Add user</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => navigation.navigate("ProductForm", undefined)}>
            <View style={styles.quickActionIconWrap}>
              <Ionicons name="add" size={18} color={theme.primaryColor} />
            </View>
            <Text style={styles.quickActionText}>Add product</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => navigation.navigate("StoreSettings")}>
            <View style={styles.quickActionIconWrap}>
              <Ionicons name="settings" size={18} color={theme.primaryColor} />
            </View>
            <Text style={styles.quickActionText}>Store settings</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
