import { ActivityIndicator, FlatList, Image, Linking, Pressable, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { VendorProfileDto } from "@ikaystores/shared";
import { VendorsApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { ThemeColors } from "../../theme/colors";

const MAX_CONTENT_WIDTH = 800;

export function PendingVendorsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const pendingQuery = useQuery({ queryKey: ["pendingVendors"], queryFn: VendorsApi.pending });
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
    centeredColumn: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const, paddingHorizontal: 16 },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    title: { fontSize: 26, fontWeight: "800" as const, color: colors.text, marginBottom: 16 },
    list: { paddingBottom: 24 },
    empty: { alignItems: "center" as const, marginTop: 40, gap: 8 },
    emptyText: { color: colors.textMuted },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    headerRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "flex-start" as const, gap: 8 },
    badgeRow: { flexDirection: "row" as const, marginTop: 8 },
    businessName: { fontWeight: "700" as const, fontSize: 16, color: colors.text, flex: 1 },
    badge: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" as const },
    description: { color: colors.textMuted, marginTop: 4 },
    docsRow: { flexDirection: "row" as const, gap: 16, marginTop: 14 },
    docThumbWrap: { alignItems: "center" as const, width: 72 },
    docThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.surfaceAlt },
    docThumbEmpty: { alignItems: "center" as const, justifyContent: "center" as const },
    docThumbLabel: { fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: "center" as const },
    actions: { flexDirection: "row" as const, gap: 10, marginTop: 12 },
  }));

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
        <ActivityIndicator color={theme.primaryColor} />
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
              <Ionicons name="storefront-outline" size={32} color={theme.colors.textFaint} />
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
                    { backgroundColor: item.identityVerified ? theme.colors.success : theme.colors.textFaint },
                  ]}
                >
                  <Ionicons
                    name={item.identityVerified ? "shield-checkmark" : "shield-outline"}
                    size={12}
                    color="#fff"
                  />
                  <Text style={styles.badgeText}>
                    {item.identityVerified ? "Identity verified" : "Not verified"}
                  </Text>
                </View>
              </View>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: item.livenessVerified ? theme.colors.success : theme.colors.textFaint },
                  ]}
                >
                  <Ionicons
                    name={item.livenessVerified ? "person-circle" : "person-circle-outline"}
                    size={12}
                    color="#fff"
                  />
                  <Text style={styles.badgeText}>
                    {item.livenessVerified ? "Liveness verified" : "Liveness not checked"}
                  </Text>
                </View>
              </View>
              {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

              <View style={styles.docsRow}>
                <DocThumb label="Business reg." url={item.businessRegistrationDocUrl} colors={theme.colors} />
                <DocThumb label="Government ID" url={item.governmentIdDocUrl} colors={theme.colors} />
              </View>

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

function DocThumb({ label, url, colors }: { label: string; url: string | null; colors: ThemeColors }) {
  const styles = useThemedStyles((c) => ({
    docThumbWrap: { alignItems: "center" as const, width: 72 },
    docThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: c.surfaceAlt },
    docThumbEmpty: { alignItems: "center" as const, justifyContent: "center" as const },
    docThumbLabel: { fontSize: 10, color: c.textMuted, marginTop: 4, textAlign: "center" as const },
  }));

  return (
    <Pressable
      style={styles.docThumbWrap}
      onPress={url ? () => Linking.openURL(url) : undefined}
      disabled={!url}
    >
      {url ? (
        <Image source={{ uri: url }} style={styles.docThumb} />
      ) : (
        <View style={[styles.docThumb, styles.docThumbEmpty]}>
          <Ionicons name="document-outline" size={18} color={colors.textFaint} />
        </View>
      )}
      <Text style={styles.docThumbLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
