import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { IdentityVerificationResultDto } from "@ikaystores/shared";
import { KycApi } from "../../api/endpoints";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { getErrorMessage } from "../../api/errorMessage";
import type { BuyerStackParamList } from "../../navigation/types";

type IdType = "NIN" | "BVN";

export function IdentityVerificationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const queryClient = useQueryClient();
  const [idType, setIdType] = useState<IdType>("NIN");
  const [idNumber, setIdNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IdentityVerificationResultDto | null>(null);

  const verifyMutation = useMutation({
    mutationFn: () => KycApi.verifyIdNumber({ idType, idNumber: idNumber.trim() }),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err) => {
      setResult(null);
      setError(getErrorMessage(err, "We couldn't verify that ID number. Please try again."));
    },
  });

  const idNumberValid = /^\d{11}$/.test(idNumber.trim());

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Verify your identity</Text>
      <Text style={styles.hint}>
        Confirm your NIN or BVN in real time — this is a quick lookup, separate from vendor
        document verification, and doesn't require a selfie or photo upload.
      </Text>

      <View style={styles.typeRow}>
        {(["NIN", "BVN"] as IdType[]).map((type) => (
          <Text
            key={type}
            style={[styles.typeOption, idType === type && styles.typeOptionActive]}
            onPress={() => {
              setIdType(type);
              setResult(null);
              setError(null);
            }}
          >
            {type}
          </Text>
        ))}
      </View>

      <FormInput
        label={idType === "NIN" ? "National Identification Number (NIN)" : "Bank Verification Number (BVN)"}
        value={idNumber}
        onChangeText={(text) => {
          setIdNumber(text.replace(/[^0-9]/g, ""));
          setResult(null);
          setError(null);
        }}
        keyboardType="number-pad"
        maxLength={11}
        placeholder="11 digit number"
      />

      {error && <Text style={styles.errorText}>{error}</Text>}

      {result && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Ionicons name="shield-checkmark" size={20} color="#059669" />
            <Text style={styles.resultTitle}>Verified</Text>
          </View>
          {result.fullName && <Text style={styles.resultLine}>Name on record: {result.fullName}</Text>}
          {result.dateOfBirth && <Text style={styles.resultLine}>Date of birth: {result.dateOfBirth}</Text>}
          {result.gender && <Text style={styles.resultLine}>Gender: {result.gender}</Text>}
        </View>
      )}

      <PrimaryButton
        title="Verify"
        onPress={() => verifyMutation.mutate()}
        loading={verifyMutation.isPending}
        disabled={!idNumberValid}
      />

      {result && (
        <PrimaryButton title="Done" variant="secondary" onPress={() => navigation.goBack()} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 8 },
  hint: { color: "#6B7280", fontSize: 14, lineHeight: 20, marginBottom: 24 },
  typeRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  typeOption: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontWeight: "700",
    color: "#6B7280",
    overflow: "hidden",
  },
  typeOptionActive: {
    borderColor: "#15803D",
    backgroundColor: "#F0FDF4",
    color: "#15803D",
  },
  errorText: { color: "#DC2626", fontSize: 13, marginBottom: 16 },
  resultCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  resultTitle: { color: "#059669", fontWeight: "800", fontSize: 15 },
  resultLine: { color: "#111827", fontSize: 14, marginTop: 4 },
});
