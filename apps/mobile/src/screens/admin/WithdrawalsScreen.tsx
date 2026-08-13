import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WithdrawalRequestDto } from "@ikaystores/shared";
import { WalletApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";

export function WithdrawalsScreen() {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.surface, paddingTop: 60, paddingHorizontal: 16 },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    title: { fontSize: 28, fontWeight: "800" as const, color: colors.text, marginBottom: 16 },
    empty: { textAlign: "center" as const, marginTop: 40, color: colors.textMuted },
    card: { backgroundColor: colors.background, borderRadius: 10, padding: 14, marginBottom: 12 },
    vendorName: { fontWeight: "700" as const, fontSize: 16, color: colors.text },
    amount: { fontSize: 18, fontWeight: "800" as const, color: colors.text, marginTop: 4 },
    date: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    actions: { flexDirection: "row" as const, gap: 10, marginTop: 12 },
  }));
  const pendingQuery = useQuery({
    queryKey: ["pendingWithdrawals"],
    queryFn: WalletApi.pendingWithdrawals,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["pendingWithdrawals"] });

  const approve = useMutation({
    mutationFn: (id: string) => WalletApi.approveWithdrawal(id),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: (id: string) => WalletApi.rejectWithdrawal(id, {}),
    onSuccess: invalidate,
  });

  if (pendingQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primaryColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Withdrawal requests</Text>
      <FlatList
        data={pendingQuery.data ?? []}
        keyExtractor={(item: WithdrawalRequestDto) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No pending withdrawal requests.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.vendorName}>{item.vendor?.businessName ?? "Vendor"}</Text>
            <Text style={styles.amount}>NGN {Number(item.amount).toLocaleString()}</Text>
            <Text style={styles.date}>
              Requested {new Date(item.requestedAt).toLocaleDateString()}
            </Text>
            <View style={styles.actions}>
              <PrimaryButton
                title="Approve"
                onPress={() => approve.mutate(item.id)}
                loading={approve.isPending}
              />
              <PrimaryButton
                title="Reject"
                variant="danger"
                onPress={() => reject.mutate(item.id)}
                loading={reject.isPending}
              />
            </View>
          </View>
        )}
      />
    </View>
  );
}
