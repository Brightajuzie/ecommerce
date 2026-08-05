import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { WalletTransactionType } from "@ikaystores/shared";
import type { BankDto, WalletTransactionDto } from "@ikaystores/shared";
import { VendorsApi, WalletApi } from "../../api/endpoints";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";

const MAX_CONTENT_WIDTH = 700;

export function WalletScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const vendorQuery = useQuery({ queryKey: ["vendorProfile"], queryFn: VendorsApi.me });
  const walletQuery = useQuery({ queryKey: ["wallet"], queryFn: WalletApi.me });
  const banksQuery = useQuery({
    queryKey: ["banks"],
    queryFn: VendorsApi.listBanks,
    enabled: !vendorQuery.data?.payoutAccount,
  });

  const [selectedBank, setSelectedBank] = useState<BankDto | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const setPayoutAccount = useMutation({
    mutationFn: () =>
      VendorsApi.setPayoutAccount({
        bankCode: selectedBank!.code,
        accountNumber,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendorProfile"] });
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

  const requestWithdrawal = useMutation({
    mutationFn: () => WalletApi.requestWithdrawal({ amount: Number(withdrawAmount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      setWithdrawAmount("");
      Alert.alert("Withdrawal requested", "An admin will review your request shortly.");
    },
    onError: (error: any) => {
      Alert.alert(
        "Could not request withdrawal",
        error?.response?.data?.message ?? "Please try again.",
      );
    },
  });

  if (vendorQuery.isLoading || walletQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primaryColor} />
      </View>
    );
  }

  const payoutAccount = vendorQuery.data?.payoutAccount ?? null;
  const balance = walletQuery.data?.balance ?? 0;
  const transactions = walletQuery.data?.transactions ?? [];

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={transactions}
      keyExtractor={(item: WalletTransactionDto) => item.id}
      ListHeaderComponent={
        <View style={styles.centeredColumn}>
          <Text style={styles.title}>Wallet</Text>
          <View style={[styles.balanceCard, { backgroundColor: theme.primaryColor }]}>
            <Text style={styles.balanceLabel}>Available balance</Text>
            <Text style={styles.balanceAmount}>NGN {Number(balance).toLocaleString()}</Text>
          </View>

          {!payoutAccount ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Set up your payout account</Text>
              <Text style={styles.sectionHint}>
                You'll need this before you can request a withdrawal.
              </Text>

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
                    <Pressable
                      key={bank.code}
                      style={styles.bankRow}
                      onPress={() => setSelectedBank(bank)}
                    >
                      <Text style={styles.bankRowText}>{bank.name}</Text>
                      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Request a withdrawal</Text>
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
                title="Request withdrawal"
                onPress={() => requestWithdrawal.mutate()}
                loading={requestWithdrawal.isPending}
                disabled={
                  !withdrawAmount ||
                  Number(withdrawAmount) <= 0 ||
                  Number(withdrawAmount) > Number(balance)
                }
              />
            </View>
          )}

          <Text style={styles.transactionsHeading}>Transaction history</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.centeredColumn}>
          <View style={styles.transactionRow}>
            <View
              style={[
                styles.transactionIconWrap,
                { backgroundColor: item.type === WalletTransactionType.CREDIT ? "#F0FDF4" : "#FEF2F2" },
              ]}
            >
              <Ionicons
                name={item.type === WalletTransactionType.CREDIT ? "arrow-down" : "arrow-up"}
                size={16}
                color={item.type === WalletTransactionType.CREDIT ? "#16A34A" : "#DC2626"}
              />
            </View>
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
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.centeredColumn}>
          <Text style={styles.empty}>No transactions yet.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { paddingTop: 60, paddingBottom: 24 },
  centeredColumn: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", paddingHorizontal: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 16 },
  balanceCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  balanceLabel: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "600" },
  balanceAmount: { color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 4 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 6 },
  sectionHint: { color: "#6B7280", fontSize: 13, marginBottom: 12 },
  changeBank: { fontWeight: "600", marginBottom: 12 },
  bankList: { maxHeight: 260 },
  bankRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  bankRowText: { fontSize: 15, color: "#111827" },
  transactionsHeading: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  transactionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  transactionInfo: { flex: 1, marginRight: 12 },
  transactionDescription: { fontSize: 14, color: "#111827", fontWeight: "600" },
  transactionDate: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  transactionAmount: { fontSize: 14, fontWeight: "700" },
  empty: { textAlign: "center", marginTop: 20, color: "#6B7280" },
});
