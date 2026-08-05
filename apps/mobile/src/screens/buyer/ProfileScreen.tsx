import { Alert, ScrollView, Share, StyleSheet, Switch, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { UserRole } from "@ikaystores/shared";
import { UsersApi, WalletApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import type { BuyerStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 700;

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);
  const setBiometricEnabled = useAuthStore((s) => s.setBiometricEnabled);
  const viewAsBuyer = useAuthStore((s) => s.viewAsBuyer);
  const setViewAsBuyer = useAuthStore((s) => s.setViewAsBuyer);
  const meQuery = useQuery({ queryKey: ["me"], queryFn: UsersApi.me, enabled: !!user });
  const isBuyer = user?.role === UserRole.BUYER;
  const buyerWalletQuery = useQuery({
    queryKey: ["buyerWallet"],
    queryFn: WalletApi.buyer,
    enabled: isBuyer,
  });

  const handleShareReferralCode = () => {
    const code = meQuery.data?.referralCode;
    if (!code) return;
    Share.share({
      message: `Join me on Ikaystores! Use my referral code ${code} when you sign up.`,
    }).catch(() => {});
  };

  const handleToggleBiometrics = async (nextValue: boolean) => {
    if (!nextValue) {
      await setBiometricEnabled(false);
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) {
      Alert.alert(
        "Not available",
        "Biometric authentication isn't set up on this device. Add a fingerprint or Face ID in your device settings first.",
      );
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Confirm to enable biometric login",
    });
    if (result.success) {
      await setBiometricEnabled(true);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.centeredColumn}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.guestPrompt}>Sign in to manage your account and view your orders.</Text>
          <PrimaryButton title="Sign in" onPress={() => navigation.navigate("Login")} />
          <View style={styles.spacer} />
          <PrimaryButton
            title="Create an account"
            variant="secondary"
            onPress={() => navigation.navigate("Register")}
          />
        </View>
      </View>
    );
  }

  const initials = `${meQuery.data?.firstName?.[0] ?? ""}${meQuery.data?.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.centeredColumn}>
        <Text style={styles.title}>Profile</Text>
        {meQuery.data && (
          <View style={styles.card}>
            <View style={[styles.avatar, { backgroundColor: theme.primaryColor }]}>
              <Text style={styles.avatarText}>{initials || "?"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {meQuery.data.firstName} {meQuery.data.lastName}
              </Text>
              <Text style={styles.email}>{meQuery.data.email}</Text>
              <View style={[styles.rolePill, { backgroundColor: theme.accentColor ?? "#F0FDF4" }]}>
                <Text style={[styles.rolePillText, { color: theme.primaryColor }]}>{meQuery.data.role}</Text>
              </View>
            </View>
          </View>
        )}

        {meQuery.data && (
          <View style={styles.identityRow}>
            <View style={styles.identityIconWrap}>
              <Ionicons
                name={meQuery.data.identityVerified ? "shield-checkmark" : "shield-outline"}
                size={20}
                color={meQuery.data.identityVerified ? "#059669" : "#6B7280"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.identityTitle}>Identity verification</Text>
              <Text style={styles.identityHint}>
                {meQuery.data.identityVerified ? "Verified" : "Verify your NIN or BVN in real time"}
              </Text>
            </View>
            <Text
              style={[styles.identityAction, { color: theme.primaryColor }]}
              onPress={() => navigation.navigate("IdentityVerification")}
            >
              {meQuery.data.identityVerified ? "View" : "Verify"}
            </Text>
          </View>
        )}

        {isBuyer && meQuery.data?.referralCode && (
          <View style={styles.referralCard}>
            <Text style={styles.referralTitle}>Refer friends, earn rewards</Text>
            <Text style={styles.referralHint}>
              Share your code — when a friend signs up and completes their first order, you get a
              bonus in your wallet.
            </Text>
            <View style={styles.referralCodeRow}>
              <Text style={styles.referralCode}>{meQuery.data.referralCode}</Text>
              <Text style={styles.referralShare} onPress={handleShareReferralCode}>
                Share
              </Text>
            </View>
            <View style={styles.referralStatsRow}>
              <View style={styles.referralStat}>
                <Text style={styles.referralStatValue}>{meQuery.data.referralCount ?? 0}</Text>
                <Text style={styles.referralStatLabel}>Friends referred</Text>
              </View>
              <View style={styles.referralStat}>
                <Text style={styles.referralStatValue}>
                  NGN {Number(buyerWalletQuery.data?.balance ?? 0).toLocaleString()}
                </Text>
                <Text style={styles.referralStatLabel}>Wallet balance</Text>
              </View>
            </View>
          </View>
        )}

        {user.role !== UserRole.BUYER && (
          <>
            <PrimaryButton
              title={viewAsBuyer ? "Back to dashboard" : "View store"}
              variant="secondary"
              onPress={() => setViewAsBuyer(!viewAsBuyer)}
            />
            <View style={styles.spacer} />
          </>
        )}

        <View style={styles.settingsCard}>
          <View style={styles.toggleRow}>
            <Ionicons name="finger-print" size={18} color="#374151" />
            <Text style={styles.toggleLabel}>Enable biometric login</Text>
            <Switch value={biometricEnabled} onValueChange={handleToggleBiometrics} />
          </View>
        </View>

        <PrimaryButton title="Log out" variant="danger" onPress={() => logout()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 32 },
  centeredColumn: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
  title: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 16 },
  guestPrompt: { color: "#6B7280", marginBottom: 20, fontSize: 15, lineHeight: 22 },
  spacer: { height: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 18 },
  name: { fontSize: 17, fontWeight: "700", color: "#111827" },
  email: { color: "#6B7280", marginTop: 2, fontSize: 13 },
  rolePill: { alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  rolePillText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  identityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  identityTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  identityHint: { color: "#6B7280", fontSize: 13, marginTop: 2 },
  identityAction: { fontWeight: "700", fontSize: 14 },
  referralCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  referralTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  referralHint: { color: "#6B7280", fontSize: 13, marginTop: 4, lineHeight: 18 },
  referralCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  referralCode: { fontSize: 18, fontWeight: "800", color: "#111827", letterSpacing: 2 },
  referralShare: { color: "#059669", fontWeight: "700", fontSize: 14 },
  referralStatsRow: { flexDirection: "row", marginTop: 14, gap: 24 },
  referralStat: {},
  referralStatValue: { fontSize: 18, fontWeight: "800", color: "#111827" },
  referralStatLabel: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  settingsCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  toggleLabel: { fontSize: 15, color: "#111827", fontWeight: "600", flex: 1 },
});
