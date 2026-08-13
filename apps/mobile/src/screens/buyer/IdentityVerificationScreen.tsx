import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { IdentityVerificationResultDto } from "@ikaystores/shared";
import { KycApi } from "../../api/endpoints";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { getErrorMessage } from "../../api/errorMessage";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { BuyerStackParamList } from "../../navigation/types";

type IdType = "NIN" | "BVN";

export function IdentityVerificationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const [idType, setIdType] = useState<IdType>("NIN");
  const [idNumber, setIdNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IdentityVerificationResultDto | null>(null);
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.surface },
    content: { padding: 20, paddingTop: 60 },
    title: { fontSize: 24, fontWeight: "800" as const, color: colors.text, marginBottom: 8 },
    hint: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 24 },
    typeRow: { flexDirection: "row" as const, gap: 10, marginBottom: 16 },
    typeOption: {
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 8,
      paddingHorizontal: 18,
      paddingVertical: 10,
      fontWeight: "700" as const,
      color: colors.textMuted,
      overflow: "hidden" as const,
    },
    typeOptionActive: {
      borderColor: theme.primaryColor,
      backgroundColor: theme.accentColor ?? colors.placeholderBg,
      color: theme.primaryColor,
    },
    errorText: { color: colors.danger, fontSize: 13, marginBottom: 16 },
    resultCard: {
      backgroundColor: theme.accentColor ?? colors.placeholderBg,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    resultHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, marginBottom: 10 },
    resultTitle: { color: colors.success, fontWeight: "800" as const, fontSize: 15 },
    resultLine: { color: colors.text, fontSize: 14, marginTop: 4 },
  }));

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
            <Ionicons name="shield-checkmark" size={20} color={theme.colors.success} />
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
