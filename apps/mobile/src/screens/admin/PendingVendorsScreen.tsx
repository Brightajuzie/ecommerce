import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { VendorProfileDto } from "@ikstore/shared";
import { VendorsApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAuthStore } from "../../store/authStore";

export function PendingVendorsScreen() {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const pendingQuery = useQuery({ queryKey: ["pendingVendors"], queryFn: VendorsApi.pending });

  const approve = useMutation({
    mutationFn: (id: string) => VendorsApi.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pendingVendors"] }),
  });
  const suspend = useMutation({
    mutationFn: (id: string) => VendorsApi.suspend(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pendingVendors"] }),
  });

  if (pendingQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pending vendors</Text>
        <PrimaryButton title="Log out" variant="secondary" onPress={() => logout()} />
      </View>
      <FlatList
        data={pendingQuery.data ?? []}
        keyExtractor={(item: VendorProfileDto) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No pending applications.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.businessName}>{item.businessName}</Text>
            {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
            <View style={styles.actions}>
              <PrimaryButton title="Approve" onPress={() => approve.mutate(item.id)} />
              <PrimaryButton
                title="Reject"
                variant="danger"
                onPress={() => suspend.mutate(item.id)}
              />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "800", color: "#111827" },
  empty: { textAlign: "center", marginTop: 40, color: "#6B7280" },
  card: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 14, marginBottom: 12 },
  businessName: { fontWeight: "700", fontSize: 16, color: "#111827" },
  description: { color: "#6B7280", marginTop: 4 },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
});
