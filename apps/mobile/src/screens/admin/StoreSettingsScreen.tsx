import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SettingsApi } from "../../api/endpoints";
import { pickAndUploadImage, ImagePickerCancelledError } from "../../api/upload";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";

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
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: SettingsApi.get });

  const [primaryColor, setPrimaryColor] = useState("#111827");
  const [secondaryColor, setSecondaryColor] = useState("#4B5563");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (settingsQuery.data) {
      setPrimaryColor(settingsQuery.data.primaryColor);
      setSecondaryColor(settingsQuery.data.secondaryColor);
      setLogoUrl(settingsQuery.data.logoUrl);
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
        <ActivityIndicator />
      </View>
    );
  }

  const primaryValid = HEX_PATTERN.test(primaryColor);
  const secondaryValid = HEX_PATTERN.test(secondaryColor);

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
        disabled={!primaryValid || !secondaryValid}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 16 },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 8, marginTop: 4 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 },
  logoPreview: { width: 72, height: 72, borderRadius: 8, backgroundColor: "#E5E7EB" },
  logoPlaceholder: { alignItems: "center", justifyContent: "center" },
  logoPlaceholderText: { fontSize: 11, color: "#6B7280" },
  uploadButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  uploadButtonText: { color: "#111827", fontWeight: "600" },
  disabled: { opacity: 0.5 },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: "transparent" },
  swatchSelected: { borderColor: "#111827" },
  previewRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  previewButton: { flex: 1, borderRadius: 8, paddingVertical: 14, alignItems: "center" },
  previewButtonText: { color: "#fff", fontWeight: "700" },
});
