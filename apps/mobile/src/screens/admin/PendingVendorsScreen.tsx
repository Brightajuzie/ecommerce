import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Linking, Pressable, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { VendorStatus, type VendorProfileDto } from "@ikaystores/shared";
import { VendorsApi } from "../../api/endpoints";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { ThemeColors } from "../../theme/colors";
import type { Theme } from "../../theme/ThemeContext";

const MAX_CONTENT_WIDTH = 800;

export function PendingVendorsScreen() {
  const theme = useTheme();
  // Vendors are auto-approved on signup (see AuthService.register) — there's
  // no real review queue to gate on anymore, so this lists every vendor
  // regardless of status. That's what keeps admin oversight meaningful:
  // suspend/reactivate/edit/delete remain available for any vendor at any
  // time, not just while an application is pending.
  const vendorsQuery = useQuery({ queryKey: ["allVendors"], queryFn: VendorsApi.listAll });
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
    centeredColumn: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const, paddingHorizontal: 16 },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    title: { fontSize: 26, fontWeight: "800" as const, color: colors.text, marginBottom: 16 },
    list: { paddingBottom: 24 },
    empty: { alignItems: "center" as const, marginTop: 40, gap: 8 },
    emptyText: { color: colors.textMuted },
  }));

  const statusColors: Record<VendorStatus, string> = {
    [VendorStatus.PENDING]: theme.colors.textFaint,
    [VendorStatus.APPROVED]: theme.colors.success,
    [VendorStatus.SUSPENDED]: theme.colors.danger,
  };

  if (vendorsQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primaryColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.centeredColumn}>
        <Text style={styles.title}>Vendors</Text>
      </View>
      <FlatList
        data={vendorsQuery.data ?? []}
        keyExtractor={(item: VendorProfileDto) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.centeredColumn}>
            <View style={styles.empty}>
              <Ionicons name="storefront-outline" size={32} color={theme.colors.textFaint} />
              <Text style={styles.emptyText}>No vendors yet.</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.centeredColumn}>
            <VendorCard vendor={item} theme={theme} statusColors={statusColors} />
          </View>
        )}
      />
    </View>
  );
}

function VendorCard({
  vendor,
  theme,
  statusColors,
}: {
  vendor: VendorProfileDto;
  theme: Theme;
  statusColors: Record<VendorStatus, string>;
}) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [businessName, setBusinessName] = useState(vendor.businessName);
  const [description, setDescription] = useState(vendor.description ?? "");
  const [commissionRate, setCommissionRate] = useState(String(vendor.commissionRate));
  const styles = useThemedStyles((colors) => ({
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
    badgeRow: { flexDirection: "row" as const, gap: 6, marginTop: 8, flexWrap: "wrap" as const },
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
    actions: { flexDirection: "row" as const, gap: 10, marginTop: 12, flexWrap: "wrap" as const },
    iconButtonRow: { flexDirection: "row" as const, gap: 4 },
    iconButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center" as const, justifyContent: "center" as const },
  }));

  const approve = useMutation({
    mutationFn: () => VendorsApi.approve(vendor.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["allVendors"] }),
    onError: (error: any) =>
      Alert.alert("Could not update vendor", error?.response?.data?.message ?? "Please try again."),
  });
  const suspend = useMutation({
    mutationFn: () => VendorsApi.suspend(vendor.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["allVendors"] }),
    onError: (error: any) =>
      Alert.alert("Could not update vendor", error?.response?.data?.message ?? "Please try again."),
  });
  const update = useMutation({
    mutationFn: () =>
      VendorsApi.update(vendor.id, {
        businessName: businessName.trim(),
        description: description.trim() || undefined,
        commissionRate: Number(commissionRate),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allVendors"] });
      setIsEditing(false);
    },
    onError: (error: any) =>
      Alert.alert("Could not save changes", error?.response?.data?.message ?? "Please try again."),
  });
  const remove = useMutation({
    mutationFn: () => VendorsApi.remove(vendor.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["allVendors"] }),
    onError: (error: any) =>
      Alert.alert(
        "Could not delete vendor",
        // deleteVendor() throws a specific reason (order history, wallet
        // balance) — surface it rather than a generic fallback, since it
        // tells the admin exactly what to do instead (suspend).
        error?.response?.data?.message ?? "Please try again.",
      ),
  });

  const confirmDelete = () => {
    Alert.alert(
      "Delete vendor",
      `Permanently delete "${vendor.businessName}"? This can't be undone. Vendors with any order or payout history can't be deleted — suspend them instead.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => remove.mutate() },
      ],
    );
  };

  const cancelEdit = () => {
    setBusinessName(vendor.businessName);
    setDescription(vendor.description ?? "");
    setCommissionRate(String(vendor.commissionRate));
    setIsEditing(false);
  };

  const commissionRateValid = /^\d+(\.\d{1,2})?$/.test(commissionRate) && Number(commissionRate) <= 100;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.businessName}>{vendor.businessName}</Text>
        <View style={styles.iconButtonRow}>
          <Pressable
            style={styles.iconButton}
            onPress={() => (isEditing ? cancelEdit() : setIsEditing(true))}
            hitSlop={6}
          >
            <Ionicons
              name={isEditing ? "close" : "create-outline"}
              size={18}
              color={theme.colors.textMuted}
            />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={confirmDelete} hitSlop={6}>
            <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
          </Pressable>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColors[vendor.status] }]}>
          <Text style={styles.badgeText}>{vendor.status}</Text>
        </View>
      </View>

      {isEditing ? (
        <>
          <FormInput label="Business name" value={businessName} onChangeText={setBusinessName} />
          <FormInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Optional"
          />
          <FormInput
            label="Commission rate (%)"
            value={commissionRate}
            onChangeText={setCommissionRate}
            keyboardType="decimal-pad"
          />
          <View style={styles.actions}>
            <PrimaryButton
              title="Save"
              onPress={() => update.mutate()}
              loading={update.isPending}
              disabled={!businessName.trim() || !commissionRateValid}
            />
            <PrimaryButton title="Cancel" variant="secondary" onPress={cancelEdit} />
          </View>
        </>
      ) : (
        <>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                { backgroundColor: vendor.identityVerified ? theme.colors.success : theme.colors.textFaint },
              ]}
            >
              <Ionicons
                name={vendor.identityVerified ? "shield-checkmark" : "shield-outline"}
                size={12}
                color="#fff"
              />
              <Text style={styles.badgeText}>
                {vendor.identityVerified ? "Identity verified" : "Not verified"}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: vendor.livenessVerified ? theme.colors.success : theme.colors.textFaint },
              ]}
            >
              <Ionicons
                name={vendor.livenessVerified ? "person-circle" : "person-circle-outline"}
                size={12}
                color="#fff"
              />
              <Text style={styles.badgeText}>
                {vendor.livenessVerified ? "Liveness verified" : "Liveness not checked"}
              </Text>
            </View>
          </View>
          {vendor.description ? <Text style={styles.description}>{vendor.description}</Text> : null}

          <View style={styles.docsRow}>
            <DocThumb label="Business reg." url={vendor.businessRegistrationDocUrl} colors={theme.colors} />
            <DocThumb label="Government ID" url={vendor.governmentIdDocUrl} colors={theme.colors} />
          </View>

          <View style={styles.actions}>
            {vendor.status === VendorStatus.PENDING && (
              <>
                <PrimaryButton title="Approve" onPress={() => approve.mutate()} loading={approve.isPending} />
                <PrimaryButton
                  title="Reject"
                  variant="danger"
                  onPress={() => suspend.mutate()}
                  loading={suspend.isPending}
                />
              </>
            )}
            {vendor.status === VendorStatus.APPROVED && (
              <PrimaryButton
                title="Suspend"
                variant="danger"
                onPress={() => suspend.mutate()}
                loading={suspend.isPending}
              />
            )}
            {vendor.status === VendorStatus.SUSPENDED && (
              <PrimaryButton title="Reactivate" onPress={() => approve.mutate()} loading={approve.isPending} />
            )}
          </View>
        </>
      )}
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
