import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { VendorStatus } from "@ikaystores/shared";
import { UsersApi, VendorsApi } from "../../api/endpoints";
import { pickAndUploadImage, ImagePickerCancelledError } from "../../api/upload";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAuthStore } from "../../store/authStore";
import { secureStorage } from "../../store/secureStorage";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { ThemeColors } from "../../theme/colors";
import type { VendorStackParamList } from "../../navigation/types";

type DocumentField = "businessRegistrationDocUrl" | "governmentIdDocUrl";

// Neither check actually blocks admin approval (see vendors.service.ts) —
// these flags are purely so the onboarding cards stop nagging once a vendor
// has explicitly said "not now", without hiding the option to still do it.
// Scoped per-user since the same device could see more than one account.
function skipStorageKey(kind: "identity" | "liveness", userId: string) {
  return `ikaystores.skipVerification.${kind}.${userId}`;
}

export function VendorPendingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<VendorStackParamList>>();
  const logout = useAuthStore((s) => s.logout);
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const theme = useTheme();
  const [uploadingField, setUploadingField] = useState<DocumentField | null>(null);
  const [skippedIdentity, setSkippedIdentity] = useState(false);
  const [skippedLiveness, setSkippedLiveness] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [skipId, skipLive] = await Promise.all([
        secureStorage.getItem(skipStorageKey("identity", userId)),
        secureStorage.getItem(skipStorageKey("liveness", userId)),
      ]);
      setSkippedIdentity(skipId === "1");
      setSkippedLiveness(skipLive === "1");
    })();
  }, [userId]);

  const skipVerification = (kind: "identity" | "liveness") => {
    if (kind === "identity") setSkippedIdentity(true);
    else setSkippedLiveness(true);
    if (userId) secureStorage.setItem(skipStorageKey(kind, userId), "1");
  };
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 24, paddingTop: 80 },
    title: { fontSize: 22, fontWeight: "800" as const, color: colors.text, marginBottom: 12, textAlign: "center" as const },
    body: { fontSize: 15, color: colors.textMuted, textAlign: "center" as const, marginBottom: 24, lineHeight: 22 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 20,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    cardHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginBottom: 6 },
    cardLabel: { fontSize: 15, fontWeight: "700" as const, color: colors.text },
    cardHint: { color: colors.textMuted, fontSize: 13, marginBottom: 12, lineHeight: 18 },
    skipLink: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "700" as const,
      textAlign: "center" as const,
      marginTop: 10,
    },
    skipNote: {
      color: colors.textFaint,
      fontSize: 12,
      textAlign: "center" as const,
      marginTop: 10,
    },
    docRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    docThumbnail: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.surfaceAlt },
    docThumbnailEmpty: { alignItems: "center" as const, justifyContent: "center" as const },
    docBody: { flex: 1 },
    docLabel: { fontSize: 14, fontWeight: "700" as const, color: colors.text },
    docHint: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
    docAction: { fontSize: 13, fontWeight: "700" as const, color: theme.primaryColor, marginTop: 4 },
  }));

  const meQuery = useQuery({ queryKey: ["me"], queryFn: UsersApi.me });
  const vendorQuery = useQuery({ queryKey: ["vendorMe"], queryFn: VendorsApi.me });

  const saveDocument = useMutation({
    mutationFn: (input: { field: DocumentField; url: string }) =>
      VendorsApi.setDocuments({ [input.field]: input.url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendorMe"] });
    },
    onError: (error: any) => {
      Alert.alert(
        "Could not save document",
        error?.response?.data?.message ?? "Please try again.",
      );
    },
  });

  const handleUpload = async (field: DocumentField) => {
    setUploadingField(field);
    try {
      const url = await pickAndUploadImage();
      saveDocument.mutate({ field, url });
    } catch (error) {
      if (!(error instanceof ImagePickerCancelledError)) {
        Alert.alert("Upload failed", "Could not upload that photo. Please try again.");
      }
    } finally {
      setUploadingField(null);
    }
  };

  const identityVerified = meQuery.data?.identityVerified ?? false;
  const livenessVerified = meQuery.data?.livenessVerified ?? false;
  // Vendors are auto-approved on signup (see AuthService.register), so this
  // screen is now mostly reached in the SUSPENDED case rather than a genuine
  // pending-review wait — branch the messaging so a suspended vendor doesn't
  // see "under review" text that no longer applies to them.
  const isSuspended = vendorQuery.data?.status === VendorStatus.SUSPENDED;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {isSuspended ? "Account suspended" : "Application under review"}
      </Text>
      <Text style={styles.body}>
        {isSuspended
          ? "Your vendor account has been suspended by an admin. Contact support if you believe this is a mistake."
          : "Your vendor account is pending approval. You'll be able to list products and manage orders once an admin approves your application."}
      </Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons
            name={identityVerified ? "shield-checkmark" : "shield-outline"}
            size={20}
            color={identityVerified ? theme.colors.success : theme.colors.textMuted}
          />
          <Text style={styles.cardLabel}>Identity verification</Text>
        </View>
        <Text style={styles.cardHint}>
          {identityVerified
            ? "Your NIN or BVN has been verified."
            : "Verify your NIN or BVN in real time — no selfie needed. Optional for now — you can also do this later from your dashboard."}
        </Text>
        {!identityVerified && (
          <>
            <PrimaryButton
              title="Verify your identity"
              onPress={() => navigation.navigate("IdentityVerification")}
            />
            {skippedIdentity ? (
              <Text style={styles.skipNote}>Skipped for now — you can still verify anytime.</Text>
            ) : (
              <Text style={styles.skipLink} onPress={() => skipVerification("identity")}>
                Skip for now
              </Text>
            )}
          </>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons
            name={livenessVerified ? "shield-checkmark" : "shield-outline"}
            size={20}
            color={livenessVerified ? theme.colors.success : theme.colors.textMuted}
          />
          <Text style={styles.cardLabel}>Liveness check</Text>
        </View>
        <Text style={styles.cardHint}>
          {livenessVerified
            ? "We've confirmed you're a real, live person."
            : "Take a quick selfie to confirm you're a real, live person — separate from the NIN/BVN lookup above. Optional for now — you can also do this later from your dashboard."}
        </Text>
        {!livenessVerified && (
          <>
            <PrimaryButton
              title="Take a selfie"
              onPress={() => navigation.navigate("LivenessCheck")}
            />
            {skippedLiveness ? (
              <Text style={styles.skipNote}>Skipped for now — you can still verify anytime.</Text>
            ) : (
              <Text style={styles.skipLink} onPress={() => skipVerification("liveness")}>
                Skip for now
              </Text>
            )}
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Documents</Text>
        <Text style={styles.cardHint}>
          Upload a photo of each document so an admin can review your application.
        </Text>

        <DocumentRow
          label="Business registration document"
          hint="e.g. CAC certificate"
          url={vendorQuery.data?.businessRegistrationDocUrl ?? null}
          uploading={uploadingField === "businessRegistrationDocUrl"}
          onUpload={() => handleUpload("businessRegistrationDocUrl")}
          colors={theme.colors}
          actionColor={theme.primaryColor}
        />
        <DocumentRow
          label="Government-issued ID"
          hint="National ID, driver's license, or passport"
          url={vendorQuery.data?.governmentIdDocUrl ?? null}
          uploading={uploadingField === "governmentIdDocUrl"}
          onUpload={() => handleUpload("governmentIdDocUrl")}
          colors={theme.colors}
          actionColor={theme.primaryColor}
        />
      </View>

      <PrimaryButton title="Log out" variant="secondary" onPress={() => logout()} />
    </ScrollView>
  );
}

function DocumentRow({
  label,
  hint,
  url,
  uploading,
  onUpload,
  colors,
  actionColor,
}: {
  label: string;
  hint: string;
  url: string | null;
  uploading: boolean;
  onUpload: () => void;
  colors: ThemeColors;
  actionColor: string;
}) {
  const styles = useThemedStyles((c) => ({
    docRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    docThumbnail: { width: 48, height: 48, borderRadius: 8, backgroundColor: c.surfaceAlt },
    docThumbnailEmpty: { alignItems: "center" as const, justifyContent: "center" as const },
    docBody: { flex: 1 },
    docLabel: { fontSize: 14, fontWeight: "700" as const, color: c.text },
    docHint: { fontSize: 12, color: c.textFaint, marginTop: 2 },
  }));

  return (
    <View style={styles.docRow}>
      {url ? (
        <Image source={{ uri: url }} style={styles.docThumbnail} />
      ) : (
        <View style={[styles.docThumbnail, styles.docThumbnailEmpty]}>
          <Ionicons name="document-outline" size={22} color={colors.textFaint} />
        </View>
      )}
      <View style={styles.docBody}>
        <Text style={styles.docLabel}>{label}</Text>
        <Text style={styles.docHint}>{hint}</Text>
        <Text
          style={{ fontSize: 13, fontWeight: "700", color: actionColor, marginTop: 4 }}
          onPress={uploading ? undefined : onUpload}
        >
          {uploading ? "Uploading…" : url ? "Replace" : "Upload"}
        </Text>
      </View>
      {url && !uploading && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
    </View>
  );
}
