import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { LivenessCheckResultDto } from "@ikaystores/shared";
import { KycApi, UsersApi } from "../../api/endpoints";
import { captureSelfieBase64, ImagePickerCancelledError } from "../../api/upload";
import { getErrorMessage } from "../../api/errorMessage";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { VendorStackParamList } from "../../navigation/types";

/**
 * Standalone liveness-check screen — extracted out of VendorPendingScreen so
 * it's reachable both during onboarding (pre-approval) and later from the
 * approved vendor dashboard's reminder banner, same pattern as
 * IdentityVerificationScreen.
 */
export function LivenessCheckScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<VendorStackParamList>>();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const meQuery = useQuery({ queryKey: ["me"], queryFn: UsersApi.me });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LivenessCheckResultDto | null>(null);
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.surface },
    content: { padding: 20, paddingTop: 60 },
    title: { fontSize: 24, fontWeight: "800" as const, color: colors.text, marginBottom: 8 },
    hint: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 24 },
    errorText: { color: colors.danger, fontSize: 13, marginBottom: 16 },
    resultCard: {
      backgroundColor: theme.accentColor ?? colors.placeholderBg,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    resultHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
    resultTitle: { color: colors.success, fontWeight: "800" as const, fontSize: 15 },
    alreadyCard: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      backgroundColor: theme.accentColor ?? colors.placeholderBg,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    alreadyText: { color: colors.text, fontWeight: "700" as const },
  }));

  const livenessVerified = meQuery.data?.livenessVerified ?? false;

  const livenessMutation = useMutation({
    mutationFn: (imageBase64: string) => KycApi.checkLiveness({ imageBase64 }),
    onSuccess: (data) => {
      if (data.live) {
        setResult(data);
        setError(null);
        queryClient.invalidateQueries({ queryKey: ["me"] });
      } else {
        setResult(null);
        setError(data.message);
      }
    },
    onError: (err) => {
      setResult(null);
      setError(getErrorMessage(err, "Couldn't run the liveness check. Please try again."));
    },
  });

  const handleTakeSelfie = async () => {
    setError(null);
    try {
      const imageBase64 = await captureSelfieBase64();
      livenessMutation.mutate(imageBase64);
    } catch (err) {
      if (!(err instanceof ImagePickerCancelledError)) {
        setError(err instanceof Error ? err.message : "Couldn't take that photo. Please try again.");
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Liveness check</Text>
      <Text style={styles.hint}>
        Take a quick front-camera selfie to confirm you're a real, live person — an
        anti-spoofing check, separate from the NIN/BVN lookup. The photo itself is never
        stored, only the result.
      </Text>

      {livenessVerified && !result ? (
        <View style={styles.alreadyCard}>
          <Ionicons name="shield-checkmark" size={20} color={theme.colors.success} />
          <Text style={styles.alreadyText}>You're already verified as a real person.</Text>
        </View>
      ) : null}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {result && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Ionicons name="shield-checkmark" size={20} color={theme.colors.success} />
            <Text style={styles.resultTitle}>Verified</Text>
          </View>
        </View>
      )}

      {!livenessVerified || !result ? (
        <PrimaryButton
          title={livenessVerified ? "Retake selfie" : "Take a selfie"}
          onPress={handleTakeSelfie}
          loading={livenessMutation.isPending}
        />
      ) : null}

      {(result?.live || livenessVerified) && (
        <PrimaryButton title="Done" variant="secondary" onPress={() => navigation.goBack()} />
      )}
    </ScrollView>
  );
}
