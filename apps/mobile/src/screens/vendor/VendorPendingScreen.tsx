import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kycIdTypes, VendorVerificationStatus } from "@ikstore/shared";
import { KycApi } from "../../api/endpoints";
import { pickAndSubmitKyc, ImagePickerCancelledError } from "../../api/upload";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAuthStore } from "../../store/authStore";

const STATUS_LABELS: Record<VendorVerificationStatus, string> = {
  [VendorVerificationStatus.NOT_STARTED]: "Not started",
  [VendorVerificationStatus.PENDING]: "Verification in progress…",
  [VendorVerificationStatus.VERIFIED]: "Identity verified",
  [VendorVerificationStatus.FAILED]: "Verification failed",
};

const STATUS_COLORS: Record<VendorVerificationStatus, string> = {
  [VendorVerificationStatus.NOT_STARTED]: "#6B7280",
  [VendorVerificationStatus.PENDING]: "#D97706",
  [VendorVerificationStatus.VERIFIED]: "#059669",
  [VendorVerificationStatus.FAILED]: "#DC2626",
};

export function VendorPendingScreen() {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [idType, setIdType] = useState<(typeof kycIdTypes)[number]>("NIN");
  const [idNumber, setIdNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const kycQuery = useQuery({
    queryKey: ["kycStatus"],
    queryFn: KycApi.status,
    refetchInterval: (query) =>
      query.state.data?.verificationStatus === VendorVerificationStatus.PENDING ? 4000 : false,
  });

  const status = kycQuery.data?.verificationStatus ?? VendorVerificationStatus.NOT_STARTED;

  const handleSubmit = async () => {
    if (!idNumber) {
      Alert.alert("Missing details", "Enter your ID number.");
      return;
    }
    setSubmitting(true);
    try {
      await pickAndSubmitKyc({ idType, idNumber, country: "NG" });
      queryClient.invalidateQueries({ queryKey: ["kycStatus"] });
      setShowForm(false);
      Alert.alert("Submitted", "Your identity verification is being processed.");
    } catch (error: any) {
      if (!(error instanceof ImagePickerCancelledError)) {
        Alert.alert(
          "Could not submit",
          error?.response?.data?.message ?? "Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Application under review</Text>
      <Text style={styles.body}>
        Your vendor account is pending approval. You'll be able to list products and manage
        orders once an admin approves your application.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Identity verification</Text>
        <View style={styles.statusRow}>
          {kycQuery.isLoading ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text style={[styles.statusText, { color: STATUS_COLORS[status] }]}>
              {STATUS_LABELS[status]}
            </Text>
          )}
        </View>

        {(status === VendorVerificationStatus.NOT_STARTED ||
          status === VendorVerificationStatus.FAILED) &&
          !showForm && (
            <PrimaryButton title="Verify your identity" onPress={() => setShowForm(true)} />
          )}

        {showForm && (
          <View style={styles.form}>
            <Text style={styles.sectionLabel}>ID type</Text>
            <View style={styles.chipRow}>
              {kycIdTypes.map((type) => (
                <Pressable
                  key={type}
                  style={[styles.chip, idType === type && styles.chipActive]}
                  onPress={() => setIdType(type)}
                >
                  <Text style={[styles.chipText, idType === type && styles.chipTextActive]}>
                    {type.replace("_", " ")}
                  </Text>
                </Pressable>
              ))}
            </View>

            <FormInput
              label="ID number"
              value={idNumber}
              onChangeText={setIdNumber}
              keyboardType="numeric"
            />

            <Text style={styles.helperText}>
              You'll be asked to select a selfie photo to submit alongside your ID number.
            </Text>

            <PrimaryButton
              title="Upload selfie & submit"
              onPress={handleSubmit}
              loading={submitting}
            />
          </View>
        )}
      </View>

      <PrimaryButton title="Log out" variant="secondary" onPress={() => logout()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 24, paddingTop: 80 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 12, textAlign: "center" },
  body: { fontSize: 15, color: "#6B7280", textAlign: "center", marginBottom: 24, lineHeight: 22 },
  card: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 16, marginBottom: 24 },
  cardLabel: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 8 },
  statusRow: { marginBottom: 12 },
  statusText: { fontSize: 15, fontWeight: "600" },
  form: { marginTop: 12 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F3F4F6" },
  chipActive: { backgroundColor: "#111827" },
  chipText: { color: "#374151", fontWeight: "600", fontSize: 12 },
  chipTextActive: { color: "#fff" },
  helperText: { fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 18 },
});
