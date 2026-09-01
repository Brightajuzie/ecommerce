import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
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
import { useThemedStyles } from "../../theme/useThemedStyles";

// Both ADMIN and SUPER_ADMIN see this screen (revenue-split settings) — the
// platform/super-admin wallet section below is the one part hidden from
// regular ADMIN, per UserRole.SUPER_ADMIN.
export function PaymentSettingsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const isSuperAdmin = useAuthStore((s) => s.user?.role === UserRole.SUPER_ADMIN);
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.surface },
    content: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 24 },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    title: { fontSize: 28, fontWeight: "800" as const, color: colors.text, marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: "700" as const, color: colors.text, marginBottom: 8, marginTop: 8 },
    subsectionTitle: { fontSize: 14, fontWeight: "700" as const, color: colors.textSecondary, marginBottom: 8, marginTop: 4 },
    sectionHint: { color: colors.textMuted, fontSize: 13, marginBottom: 12 },
    warning: { color: colors.danger, fontSize: 12, marginTop: -8, marginBottom: 12 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 24 },
    section: { marginBottom: 12 },
    balanceCard: { borderRadius: 14, padding: 20, marginBottom: 16 },
    balanceLabel: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "600" as const },
    balanceAmount: { color: "#fff", fontSize: 32, fontWeight: "800" as const, marginTop: 4 },
    changeBank: { fontWeight: "600" as const, marginBottom: 12 },
    bankList: { maxHeight: 260 },
    bankRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    bankRowText: { fontSize: 15, color: colors.text },
    transactionRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    transactionInfo: { flex: 1, marginRight: 12 },
    transactionDescription: { fontSize: 14, color: colors.text, fontWeight: "600" as const },
    transactionDate: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
    transactionAmount: { fontSize: 14, fontWeight: "700" as const },
    empty: { color: colors.textMuted, marginBottom: 12 },
  }));
  const creditColor = theme.scheme === "dark" ? "#4ADE80" : "#16A34A";
  const debitColor = theme.scheme === "dark" ? "#F87171" : "#DC2626";

  const settingsQuery = useQuery({ queryKey: ["paymentSettings"], queryFn: PaymentSettingsApi.get });
  const platformWalletQuery = useQuery({
    queryKey: ["platformWallet"],
    queryFn: WalletApi.platform,
    enabled: isSuperAdmin,
  });
  const gatewaySettingsQuery = useQuery({
    queryKey: ["gatewaySettings"],
    queryFn: PaymentSettingsApi.getGateway,
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

  // Gateway credential fields start blank rather than prefilled with the
  // masked value from the server (e.g. "••••1234") — submitting that mask
  // back as-is would otherwise overwrite the real secret with garbage.
  // Leaving a field blank on save means "keep the current value".
  const [flwPublicKey, setFlwPublicKey] = useState("");
  const [flwSecretKey, setFlwSecretKey] = useState("");
  const [flwEncryptionKey, setFlwEncryptionKey] = useState("");
  const [opayMerchantId, setOpayMerchantId] = useState("");
  const [opayPublicKey, setOpayPublicKey] = useState("");
  const [opaySecretKey, setOpaySecretKey] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [dojahAppId, setDojahAppId] = useState("");
  const [dojahSecretKey, setDojahSecretKey] = useState("");
  const [dojahEnvironment, setDojahEnvironment] = useState<"sandbox" | "production">("sandbox");

  useEffect(() => {
    if (settingsQuery.data) {
      setCompanyPercent(String(settingsQuery.data.companySharePercent));
      setDeveloperPercent(String(settingsQuery.data.developerSharePercent));
      setSuperAdminPercent(String(settingsQuery.data.superAdminFeePercent));
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    if (gatewaySettingsQuery.data) {
      // Public-facing values (not secrets) are safe to prefill in full.
      setFlwPublicKey(gatewaySettingsQuery.data.flutterwavePublicKey ?? "");
      setOpayMerchantId(gatewaySettingsQuery.data.opayMerchantId ?? "");
      setOpayPublicKey(gatewaySettingsQuery.data.opayPublicKey ?? "");
      setSupportEmail(gatewaySettingsQuery.data.supportEmail ?? "");
      setDojahAppId(gatewaySettingsQuery.data.dojahAppId ?? "");
      setDojahEnvironment(
        gatewaySettingsQuery.data.dojahEnvironment === "production" ? "production" : "sandbox",
      );
    }
  }, [gatewaySettingsQuery.data]);

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

  const updateGateway = useMutation({
    mutationFn: () =>
      PaymentSettingsApi.updateGateway({
        flutterwavePublicKey: flwPublicKey || undefined,
        flutterwaveSecretKey: flwSecretKey || undefined,
        flutterwaveEncryptionKey: flwEncryptionKey || undefined,
        opayMerchantId: opayMerchantId || undefined,
        opayPublicKey: opayPublicKey || undefined,
        opaySecretKey: opaySecretKey || undefined,
        supportEmail: supportEmail || undefined,
        dojahAppId: dojahAppId || undefined,
        dojahSecretKey: dojahSecretKey || undefined,
        dojahEnvironment,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gatewaySettings"] });
      setFlwSecretKey("");
      setFlwEncryptionKey("");
      setOpaySecretKey("");
      setDojahSecretKey("");
      Alert.alert("Saved", "Payment gateway settings updated.");
    },
    onError: (error: any) => {
      Alert.alert("Could not save", error?.response?.data?.message ?? "Please try again.");
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

  if (settingsQuery.isLoading || platformWalletQuery.isLoading || gatewaySettingsQuery.isLoading) {
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

          <Text style={styles.sectionTitle}>Payment gateway</Text>
          <Text style={styles.sectionHint}>
            These override the server's environment-variable defaults as soon as they're saved.
            Secret fields show as blank here even when already set — leave a field blank to keep
            its current value; only fill it in to change it.
          </Text>

          <Text style={styles.subsectionTitle}>Flutterwave</Text>
          <FormInput
            label="Public key"
            value={flwPublicKey}
            onChangeText={setFlwPublicKey}
            autoCapitalize="none"
          />
          <FormInput
            label={`Secret key${gatewaySettingsQuery.data?.flutterwaveSecretKey ? ` (currently ${gatewaySettingsQuery.data.flutterwaveSecretKey})` : ""}`}
            value={flwSecretKey}
            onChangeText={setFlwSecretKey}
            autoCapitalize="none"
            secureTextEntry
            placeholder="Leave blank to keep unchanged"
          />
          <FormInput
            label={`Encryption key${gatewaySettingsQuery.data?.flutterwaveEncryptionKey ? ` (currently ${gatewaySettingsQuery.data.flutterwaveEncryptionKey})` : ""}`}
            value={flwEncryptionKey}
            onChangeText={setFlwEncryptionKey}
            autoCapitalize="none"
            secureTextEntry
            placeholder="Leave blank to keep unchanged"
          />

          <Text style={styles.subsectionTitle}>Opay</Text>
          <FormInput
            label="Merchant ID"
            value={opayMerchantId}
            onChangeText={setOpayMerchantId}
            autoCapitalize="none"
          />
          <FormInput
            label="Public key"
            value={opayPublicKey}
            onChangeText={setOpayPublicKey}
            autoCapitalize="none"
          />
          <FormInput
            label={`Secret key${gatewaySettingsQuery.data?.opaySecretKey ? ` (currently ${gatewaySettingsQuery.data.opaySecretKey})` : ""}`}
            value={opaySecretKey}
            onChangeText={setOpaySecretKey}
            autoCapitalize="none"
            secureTextEntry
            placeholder="Leave blank to keep unchanged"
          />

          <Text style={styles.subsectionTitle}>
            Identity verification (Dojah){" "}
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700" as const,
                color: gatewaySettingsQuery.data?.dojahAppId && gatewaySettingsQuery.data?.dojahSecretKey
                  ? theme.colors.success
                  : theme.colors.textFaint,
              }}
            >
              {gatewaySettingsQuery.data?.dojahAppId && gatewaySettingsQuery.data?.dojahSecretKey
                ? "● Active"
                : "○ Not configured"}
            </Text>
          </Text>
          <Text style={styles.sectionHint}>
            Powers real-time NIN/BVN lookup and the vendor-onboarding liveness check. Activates
            automatically as soon as both fields below are saved — no server restart needed.
          </Text>
          <FormInput
            label="App ID"
            value={dojahAppId}
            onChangeText={setDojahAppId}
            autoCapitalize="none"
          />
          <FormInput
            label={`Secret key${gatewaySettingsQuery.data?.dojahSecretKey ? ` (currently ${gatewaySettingsQuery.data.dojahSecretKey})` : ""}`}
            value={dojahSecretKey}
            onChangeText={setDojahSecretKey}
            autoCapitalize="none"
            secureTextEntry
            placeholder="Leave blank to keep unchanged"
          />
          <View style={{ flexDirection: "row" as const, gap: 8, marginBottom: 12 }}>
            {(["sandbox", "production"] as const).map((env) => (
              <Pressable
                key={env}
                onPress={() => setDojahEnvironment(env)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  alignItems: "center" as const,
                  backgroundColor: dojahEnvironment === env ? theme.primaryColor : theme.colors.surfaceAlt,
                }}
              >
                <Text
                  style={{
                    fontWeight: "700" as const,
                    fontSize: 13,
                    color: dojahEnvironment === env ? "#fff" : theme.colors.textMuted,
                    textTransform: "capitalize" as const,
                  }}
                >
                  {env}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.subsectionTitle}>Support</Text>
          <FormInput
            label="Support / contact email"
            value={supportEmail}
            onChangeText={setSupportEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <PrimaryButton
            title="Save gateway settings"
            onPress={() => updateGateway.mutate()}
            loading={updateGateway.isPending}
          />

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
                    { color: item.type === WalletTransactionType.CREDIT ? creditColor : debitColor },
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
