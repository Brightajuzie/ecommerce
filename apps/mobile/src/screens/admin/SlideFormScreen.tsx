import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SlidesApi } from "../../api/endpoints";
import { pickAndUploadImage, ImagePickerCancelledError } from "../../api/upload";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { AdminStackParamList } from "../../navigation/types";

export function SlideFormScreen() {
  const route = useRoute<RouteProp<AdminStackParamList, "SlideForm">>();
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const queryClient = useQueryClient();
  const slideId = route.params?.slideId;

  const slidesQuery = useQuery({ queryKey: ["adminSlides"], queryFn: SlidesApi.listAll });
  const existingSlide = slidesQuery.data?.find((s) => s.id === slideId);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.surface },
    content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
    title: { fontSize: 24, fontWeight: "800" as const, color: colors.text, marginBottom: 16 },
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
    setUploading(true);
    try {
      const url = await pickAndUploadImage();
      setImageUrl(url);
    } catch (error) {
      if (!(error instanceof ImagePickerCancelledError)) {
        Alert.alert("Upload failed", "Could not upload that image. Please try again.");
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
      Alert.alert("Could not save slide", error?.response?.data?.message ?? "Please try again.");
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{slideId ? "Edit slide" : "New slide"}</Text>

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
