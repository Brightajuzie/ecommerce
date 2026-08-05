import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { VendorProfileDto } from "@ikaystores/shared";
import { VendorVerificationStatus } from "@ikaystores/shared";
import { VendorsApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";

const MAX_CONTENT_WIDTH = 800;

const VERIFICATION_LABELS: Record<VendorVerificationStatus, string> = {
  [VendorVerificationStatus.NOT_STARTED]: "Not verified",
  [VendorVerificationStatus.PENDING]: "Verification pending",
  [VendorVerificationStatus.VERIFIED]: "Identity verified",
  [VendorVerificationStatus.FAILED]: "Verification failed",
};

const VERIFICATION_COLORS: Record<VendorVerificationStatus, string> = {
  [VendorVerificationStatus.NOT_STARTED]: "#9CA3AF",
  [VendorVerificationStatus.PENDING]: "#D97706",
  [VendorVerificationStatus.VERIFIED]: "#059669",
  [VendorVerificationStatus.FAILED]: "#DC2626",
};

export function PendingVendorsScreen() {
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
      <View style={styles.centeredColumn}>
        <Text style={styles.title}>Pending vendors</Text>
      </View>
      <FlatList
        data={pendingQuery.data ?? []}
        keyExtractor={(item: VendorProfileDto) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.centeredColumn}>
            <View style={styles.empty}>
              <Ionicons name="storefront-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyText}>No pending applications.</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.centeredColumn}>
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.businessName}>{item.businessName}</Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: VERIFICATION_COLORS[item.verificationStatus] },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {VERIFICATION_LABELS[item.verificationStatus]}
                  </Text>
                </View>
              </View>
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
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", paddingTop: 60 },
  centeredColumn: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", paddingHorizontal: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "800", color: "#111827", marginBottom: 16 },
  list: { paddingBottom: 24 },
  empty: { alignItems: "center", marginTop: 40, gap: 8 },
  emptyText: { color: "#6B7280" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  businessName: { fontWeight: "700", fontSize: 16, color: "#111827", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  description: { color: "#6B7280", marginTop: 4 },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
});
