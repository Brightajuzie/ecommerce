import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SettingsApi } from "../../api/endpoints";
import { pickAndUploadImage, ImagePickerCancelledError } from "../../api/upload";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";

const PRESET_COLORS = [
  "#111827",
  "#1D4ED8",
  "#2563EB",
  "#059669",
  "#DC2626",
  "#D97706",
  "#7C3AED",
  "#DB2777",
];

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function StoreSettingsScreen() {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: SettingsApi.get });
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.surface },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
    title: { fontSize: 28, fontWeight: "800" as const, color: colors.text, marginBottom: 16 },
    sectionLabel: { fontSize: 14, fontWeight: "700" as const, color: colors.text, marginBottom: 8, marginTop: 4 },
    logoRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 16, marginBottom: 20 },
    logoPreview: { width: 72, height: 72, borderRadius: 8, backgroundColor: colors.border },
    logoPlaceholder: { alignItems: "center" as const, justifyContent: "center" as const },
    logoPlaceholderText: { fontSize: 11, color: colors.textMuted },
    uploadButton: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.surfaceAlt,
    },
    uploadButtonText: { color: colors.text, fontWeight: "600" as const },
    disabled: { opacity: 0.5 },
    swatchRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 10, marginBottom: 12 },
    swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: "transparent" },
    swatchSelected: { borderColor: colors.text },
    previewRow: { flexDirection: "row" as const, gap: 10, marginBottom: 24 },
    previewButton: { flex: 1, borderRadius: 8, paddingVertical: 14, alignItems: "center" as const },
    previewButtonText: { color: "#fff", fontWeight: "700" as const },
  }));

  const [primaryColor, setPrimaryColor] = useState("#111827");
  const [secondaryColor, setSecondaryColor] = useState("#4B5563");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [referralBonusAmount, setReferralBonusAmount] = useState("500");

  useEffect(() => {
    if (settingsQuery.data) {
      setPrimaryColor(settingsQuery.data.primaryColor);
      setSecondaryColor(settingsQuery.data.secondaryColor);
      setLogoUrl(settingsQuery.data.logoUrl);
      setReferralBonusAmount(String(settingsQuery.data.referralBonusAmount));
    }
  }, [settingsQuery.data]);

  const handleUploadLogo = async () => {
    setUploadingLogo(true);
    try {
      const url = await pickAndUploadImage();
      setLogoUrl(url);
    } catch (error) {
      if (!(error instanceof ImagePickerCancelledError)) {
        Alert.alert("Upload failed", "Could not upload the logo. Please try again.");
      }
    } finally {
      setUploadingLogo(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      SettingsApi.update({
        primaryColor,
        secondaryColor,
        logoUrl: logoUrl ?? undefined,
        referralBonusAmount: Number(referralBonusAmount),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
      Alert.alert("Saved", "Storefront settings updated.");
    },
    onError: (error: any) => {
      Alert.alert("Could not save", error?.response?.data?.message ?? "Please try again.");
    },
  });

  if (settingsQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primaryColor} />
      </View>
    );
  }

  const primaryValid = HEX_PATTERN.test(primaryColor);
  const secondaryValid = HEX_PATTERN.test(secondaryColor);
  const referralBonusValid = Number(referralBonusAmount) >= 0 && referralBonusAmount !== "";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Store settings</Text>

      <Text style={styles.sectionLabel}>Logo</Text>
      <View style={styles.logoRow}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logoPreview} />
        ) : (
          <View style={[styles.logoPreview, styles.logoPlaceholder]}>
            <Text style={styles.logoPlaceholderText}>No logo</Text>
          </View>
        )}
        <Pressable
          style={[styles.uploadButton, uploadingLogo && styles.disabled]}
          onPress={handleUploadLogo}
          disabled={uploadingLogo}
        >
          <Text style={styles.uploadButtonText}>
            {uploadingLogo ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>Primary color</Text>
      <View style={styles.swatchRow}>
        {PRESET_COLORS.map((color) => (
          <Pressable
            key={color}
            style={[
              styles.swatch,
              { backgroundColor: color },
              primaryColor === color && styles.swatchSelected,
            ]}
            onPress={() => setPrimaryColor(color)}
          />
        ))}
      </View>
      <FormInput
        label="Primary color (hex)"
        value={primaryColor}
        onChangeText={setPrimaryColor}
        autoCapitalize="characters"
        placeholder="#111827"
      />

      <Text style={styles.sectionLabel}>Secondary color</Text>
      <View style={styles.swatchRow}>
        {PRESET_COLORS.map((color) => (
          <Pressable
            key={color}
            style={[
              styles.swatch,
              { backgroundColor: color },
              secondaryColor === color && styles.swatchSelected,
            ]}
            onPress={() => setSecondaryColor(color)}
          />
        ))}
      </View>
      <FormInput
        label="Secondary color (hex)"
        value={secondaryColor}
        onChangeText={setSecondaryColor}
        autoCapitalize="characters"
        placeholder="#4B5563"
      />

      <Text style={styles.sectionLabel}>Referral bonus</Text>
      <FormInput
        label="Bonus per successful referral (NGN)"
        value={referralBonusAmount}
        onChangeText={setReferralBonusAmount}
        keyboardType="decimal-pad"
        placeholder="500"
      />

      <Text style={styles.sectionLabel}>Preview</Text>
      <View style={styles.previewRow}>
        <View style={[styles.previewButton, { backgroundColor: primaryColor }]}>
          <Text style={styles.previewButtonText}>Primary</Text>
        </View>
        <View style={[styles.previewButton, { backgroundColor: secondaryColor }]}>
          <Text style={styles.previewButtonText}>Secondary</Text>
        </View>
      </View>

      <PrimaryButton
        title="Save settings"
        onPress={() => saveMutation.mutate()}
        loading={saveMutation.isPending}
        disabled={!primaryValid || !secondaryValid || !referralBonusValid}
      />
    </ScrollView>
  );
}
