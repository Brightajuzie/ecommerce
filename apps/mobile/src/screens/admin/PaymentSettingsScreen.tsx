import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRole, WalletTransactionType } from "@ikaystores/shared";
import type { BankDto } from "@ikaystores/shared";
import { PaymentSettingsApi, VendorsApi, WalletApi } from "../../api/endpoints";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../theme/ThemeContext";

// Both ADMIN and SUPER_ADMIN see this screen (revenue-split settings) — the
// platform/super-admin wallet section below is the one part hidden from
// regular ADMIN, per UserRole.SUPER_ADMIN.
export function PaymentSettingsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const isSuperAdmin = useAuthStore((s) => s.user?.role === UserRole.SUPER_ADMIN);

  const settingsQuery = useQuery({ queryKey: ["paymentSettings"], queryFn: PaymentSettingsApi.get });
  const platformWalletQuery = useQuery({
    queryKey: ["platformWallet"],
    queryFn: WalletApi.platform,
    enabled: isSuperAdmin,
  });
  const banksQuery = useQuery({
    queryKey: ["banks"],
    queryFn: VendorsApi.listBanks,
    enabled: !settingsQuery.data?.payoutAccount,
  });

  const [companyPercent, setCompanyPercent] = useState("");
  const [developerPercent, setDeveloperPercent] = useState("");
  const [superAdminPercent, setSuperAdminPercent] = useState("");
  const [selectedBank, setSelectedBank] = useState<BankDto | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  useEffect(() => {
    if (settingsQuery.data) {
      setCompanyPercent(String(settingsQuery.data.companySharePercent));
      setDeveloperPercent(String(settingsQuery.data.developerSharePercent));
      setSuperAdminPercent(String(settingsQuery.data.superAdminFeePercent));
    }
  }, [settingsQuery.data]);

  const splitSum = Number(companyPercent || 0) + Number(developerPercent || 0);
  const splitValid = Math.round(splitSum * 100) / 100 === 100;

  const updateSettings = useMutation({
    mutationFn: () =>
      PaymentSettingsApi.update({
        companySharePercent: Number(companyPercent),
        developerSharePercent: Number(developerPercent),
        superAdminFeePercent: Number(superAdminPercent),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentSettings"] });
      Alert.alert("Saved", "Revenue-split settings updated.");
    },
    onError: (error: any) => {
      Alert.alert("Could not save", error?.response?.data?.message ?? "Please try again.");
    },
  });

  const setPayoutAccount = useMutation({
    mutationFn: () =>
      PaymentSettingsApi.setPayoutAccount({ bankCode: selectedBank!.code, accountNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentSettings"] });
      setSelectedBank(null);
      setAccountNumber("");
    },
    onError: (error: any) => {
      Alert.alert(
        "Could not verify account",
        error?.response?.data?.message ?? "Please check the bank and account number and try again.",
      );
    },
  });

  const withdrawFromPlatform = useMutation({
    mutationFn: () => WalletApi.withdrawFromPlatform({ amount: Number(withdrawAmount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platformWallet"] });
      setWithdrawAmount("");
      Alert.alert("Withdrawal initiated", "Check the transaction history for status.");
    },
    onError: (error: any) => {
      Alert.alert(
        "Could not withdraw",
        error?.response?.data?.message ?? "Please try again.",
      );
    },
  });

  if (settingsQuery.isLoading || platformWalletQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primaryColor} />
      </View>
    );
  }

  const payoutAccount = settingsQuery.data?.payoutAccount ?? null;
  const balance = platformWalletQuery.data?.balance ?? 0;
  const transactions = platformWalletQuery.data?.transactions ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Payments</Text>

      <Text style={styles.sectionTitle}>Revenue split</Text>
      <Text style={styles.sectionHint}>
        Company and developer subdivide the vendor commission (must sum to 100%). The super-admin
        fee is a flat extra cut of every sale, taken separately.
      </Text>
      <FormInput
        label="Company share (%)"
        value={companyPercent}
        onChangeText={setCompanyPercent}
        keyboardType="decimal-pad"
      />
      <FormInput
        label="Developer share (%)"
        value={developerPercent}
        onChangeText={setDeveloperPercent}
        keyboardType="decimal-pad"
      />
      {!splitValid && (
        <Text style={styles.warning}>Company + developer must sum to 100% (currently {splitSum}%).</Text>
      )}
      <FormInput
        label="Super-admin fee (%)"
        value={superAdminPercent}
        onChangeText={setSuperAdminPercent}
        keyboardType="decimal-pad"
      />
      <PrimaryButton
        title="Save revenue split"
        onPress={() => updateSettings.mutate()}
        loading={updateSettings.isPending}
        disabled={!splitValid || !companyPercent || !developerPercent || !superAdminPercent}
      />

      {isSuperAdmin && (
        <>
          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Platform wallet</Text>
          <View style={[styles.balanceCard, { backgroundColor: theme.primaryColor }]}>
            <Text style={styles.balanceLabel}>Available balance</Text>
            <Text style={styles.balanceAmount}>NGN {Number(balance).toLocaleString()}</Text>
          </View>

          {!payoutAccount ? (
            <View style={styles.section}>
              <Text style={styles.sectionHint}>Set up a payout account before withdrawing.</Text>
              {selectedBank ? (
                <>
                  <Pressable onPress={() => setSelectedBank(null)}>
                    <Text style={[styles.changeBank, { color: theme.primaryColor }]}>
                      Bank: {selectedBank.name} (change)
                    </Text>
                  </Pressable>
                  <FormInput
                    label="Account number"
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                  <PrimaryButton
                    title="Verify and save"
                    onPress={() => setPayoutAccount.mutate()}
                    loading={setPayoutAccount.isPending}
                    disabled={accountNumber.length !== 10}
                  />
                </>
              ) : banksQuery.isLoading ? (
                <ActivityIndicator color={theme.primaryColor} />
              ) : (
                <View style={styles.bankList}>
                  {(banksQuery.data ?? []).map((bank) => (
                    <Pressable key={bank.code} style={styles.bankRow} onPress={() => setSelectedBank(bank)}>
                      <Text style={styles.bankRowText}>{bank.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionHint}>
                Paying out to {payoutAccount.bankName} — {payoutAccount.accountName}
              </Text>
              <FormInput
                label="Amount (NGN)"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                keyboardType="decimal-pad"
              />
              <PrimaryButton
                title="Withdraw"
                onPress={() => withdrawFromPlatform.mutate()}
                loading={withdrawFromPlatform.isPending}
                disabled={
                  !withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > Number(balance)
                }
              />
            </View>
          )}

          <Text style={styles.sectionTitle}>Transaction history</Text>
          {transactions.length === 0 ? (
            <Text style={styles.empty}>No transactions yet.</Text>
          ) : (
            transactions.map((item) => (
              <View key={item.id} style={styles.transactionRow}>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>{item.description}</Text>
                  <Text style={styles.transactionDate}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    { color: item.type === WalletTransactionType.CREDIT ? "#16A34A" : "#DC2626" },
                  ]}
                >
                  {item.type === WalletTransactionType.CREDIT ? "+" : "-"}NGN{" "}
                  {Number(item.amount).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 8, marginTop: 8 },
  sectionHint: { color: "#6B7280", fontSize: 13, marginBottom: 12 },
  warning: { color: "#DC2626", fontSize: 12, marginTop: -8, marginBottom: 12 },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 24 },
  section: { marginBottom: 12 },
  balanceCard: { borderRadius: 14, padding: 20, marginBottom: 16 },
  balanceLabel: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "600" },
  balanceAmount: { color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 4 },
  changeBank: { fontWeight: "600", marginBottom: 12 },
  bankList: { maxHeight: 260 },
  bankRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  bankRowText: { fontSize: 15, color: "#111827" },
  transactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  transactionInfo: { flex: 1, marginRight: 12 },
  transactionDescription: { fontSize: 14, color: "#111827", fontWeight: "600" },
  transactionDate: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  transactionAmount: { fontSize: 14, fontWeight: "700" },
  empty: { color: "#6B7280", marginBottom: 12 },
});
