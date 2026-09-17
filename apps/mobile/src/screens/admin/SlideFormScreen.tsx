import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { SlidesApi } from "../../api/endpoints";
import { getErrorMessage } from "../../api/errorMessage";
import { pickAndUploadImage, ImagePickerCancelledError } from "../../api/upload";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { UploadProgressBar } from "../../components/UploadProgressBar";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { AdminStackParamList } from "../../navigation/types";

export function SlideFormScreen() {
  const route = useRoute<RouteProp<AdminStackParamList, "SlideForm">>();
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const slideId = route.params?.slideId;

  const slidesQuery = useQuery({ queryKey: ["adminSlides"], queryFn: SlidesApi.listAll });
  const existingSlide = slidesQuery.data?.find((s) => s.id === slideId);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  // Rendered inline rather than via Alert.alert — see ProductFormScreen for
  // the same fix and why: Alert.alert can be silently suppressed on some
  // mobile web browsers, which would otherwise leave a failed upload with
  // no visible feedback at all.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const styles = useThemedStyles((colors, t) => ({
    container: { flex: 1, backgroundColor: colors.surface },
    content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
    headerRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, marginBottom: 16 },
    errorBanner: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      backgroundColor: t.scheme === "dark" ? "#3A1518" : "#FEF2F2",
      borderWidth: 1,
      borderColor: t.scheme === "dark" ? "#5B2226" : "#FECACA",
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    errorBannerText: { flex: 1, color: t.scheme === "dark" ? "#FCA5A5" : "#B91C1C", fontSize: 13, fontWeight: "600" as const },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceAlt,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    logo: { height: 28, width: 64 },
    title: { fontSize: 24, fontWeight: "800" as const, color: colors.text, flex: 1 },
    sectionLabel: { fontSize: 14, fontWeight: "700" as const, color: colors.text, marginBottom: 8 },
    preview: { width: "100%" as const, aspectRatio: 2.4, borderRadius: 8, backgroundColor: colors.border, marginBottom: 12 },
    previewPlaceholder: { alignItems: "center" as const, justifyContent: "center" as const },
    placeholderText: { color: colors.textMuted },
    uploadButton: {
      alignSelf: "flex-start" as const,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.surfaceAlt,
      marginBottom: 20,
    },
    uploadButtonText: { color: colors.text, fontWeight: "600" as const },
    uploadProgressWrap: { marginTop: -12, marginBottom: 20, maxWidth: 200 },
    disabled: { opacity: 0.5 },
    toggleRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      marginBottom: 24,
    },
    toggleLabel: { fontSize: 15, color: colors.text, fontWeight: "600" as const, flex: 1 },
  }));

  useEffect(() => {
    if (existingSlide) {
      setImageUrl(existingSlide.imageUrl);
      setTitle(existingSlide.title ?? "");
      setLinkUrl(existingSlide.linkUrl ?? "");
      setIsActive(existingSlide.isActive);
    }
  }, [existingSlide]);

  const handleUpload = async () => {
    setErrorMessage(null);
    setUploadProgress(0);
    setUploading(true);
    try {
      const url = await pickAndUploadImage("banner", setUploadProgress);
      setImageUrl(url);
    } catch (error) {
      if (!(error instanceof ImagePickerCancelledError)) {
        setErrorMessage(getErrorMessage(error, "Could not upload that image. Please try again."));
      }
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        imageUrl: imageUrl as string,
        title: title || undefined,
        linkUrl: linkUrl || undefined,
        isActive,
        sortOrder: existingSlide?.sortOrder ?? 0,
      };
      return slideId ? SlidesApi.update(slideId, payload) : SlidesApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSlides"] });
      queryClient.invalidateQueries({ queryKey: ["slides"] });
      navigation.goBack();
    },
    onError: (error: any) => {
      setErrorMessage(getErrorMessage(error, "Could not save slide. Please try again."));
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>{slideId ? "Edit slide" : "New slide"}</Text>
        {/* Stack-pushed screens sit outside AdminTabNavigator, so
            ResponsiveTabBar's own clickable brand logo isn't on screen
            here — this recreates "tap the logo to go home". */}
        <Pressable onPress={() => navigation.navigate("AdminTabs")} hitSlop={8}>
          <Image
            source={require("../../../assets/logo-green.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Pressable>
      </View>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={theme.colors.danger} />
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>Image</Text>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.preview} />
      ) : (
        <View style={[styles.preview, styles.previewPlaceholder]}>
          <Text style={styles.placeholderText}>No image selected</Text>
        </View>
      )}
      <Pressable
        style={[styles.uploadButton, uploading && styles.disabled]}
        onPress={handleUpload}
        disabled={uploading}
      >
        <Text style={styles.uploadButtonText}>
          {uploading ? "Uploading…" : imageUrl ? "Replace image" : "Upload image"}
        </Text>
      </Pressable>
      {uploading && (
        <View style={styles.uploadProgressWrap}>
          <UploadProgressBar percent={uploadProgress} />
        </View>
      )}

      <FormInput label="Title (optional)" value={title} onChangeText={setTitle} />
      <FormInput
        label="Link URL (optional)"
        value={linkUrl}
        onChangeText={setLinkUrl}
        placeholder="https://..."
        keyboardType="url"
      />

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Active (visible on home screen)</Text>
        <Switch value={isActive} onValueChange={setIsActive} />
      </View>

      <PrimaryButton
        title="Save slide"
        onPress={() => saveMutation.mutate()}
        loading={saveMutation.isPending}
        disabled={!imageUrl}
      />
    </ScrollView>
  );
}
