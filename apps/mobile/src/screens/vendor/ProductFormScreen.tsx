import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { ProductStatus } from "@ikaystores/shared";
import { ProductsApi, CategoriesApi } from "../../api/endpoints";
import { pickAndUploadImage, ImagePickerCancelledError } from "../../api/upload";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";

const MAX_CONTENT_WIDTH = 700;

// Reused from both VendorStackParamList and AdminStackParamList (identical
// "ProductForm" route shape in both) — admin can fully edit any vendor's
// product via the same backend endpoint, which now also accepts ADMIN/
// SUPER_ADMIN callers. Typed against a minimal shared shape instead of
// either specific param list so it isn't coupled to one navigator.
type ProductFormParamList = { ProductForm: { productId?: string } | undefined };

export function ProductFormScreen() {
  const route = useRoute<RouteProp<ProductFormParamList, "ProductForm">>();
  const navigation = useNavigation<NativeStackNavigationProp<ProductFormParamList>>();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const productId = route.params?.productId;

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: CategoriesApi.list });
  const productQuery = useQuery({
    queryKey: ["product", productId],
    queryFn: () => ProductsApi.findOne(productId as string),
    enabled: !!productId,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [status, setStatus] = useState<ProductStatus>(ProductStatus.ACTIVE);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (productQuery.data) {
      const p = productQuery.data;
      setTitle(p.title);
      setDescription(p.description);
      setPrice(String(p.price));
      setStock(String(p.stock));
      setImages(p.images);
      setCategoryId(p.categoryId);
      setStatus(p.status);
    }
  }, [productQuery.data]);

  const handleAddPhoto = async () => {
    setUploading(true);
    try {
      const url = await pickAndUploadImage();
      setImages((prev) => [...prev, url]);
    } catch (error) {
      if (!(error instanceof ImagePickerCancelledError)) {
        Alert.alert("Upload failed", "Could not upload that photo. Please try again.");
      }
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title,
        description,
        price: Number(price),
        currency: "NGN",
        stock: Number(stock),
        images,
        categoryId: categoryId as string,
        status,
      };
      return productId ? ProductsApi.update(productId, payload) : ProductsApi.create(payload);
    },
    onSuccess: () => {
      // Invalidates both possible list caches — a no-op for whichever one
      // isn't populated, since this screen is reached from either the
      // vendor's "My products" list or the admin products list.
      queryClient.invalidateQueries({ queryKey: ["myProducts"] });
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert("Could not save product", error?.response?.data?.message ?? "Please try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => ProductsApi.remove(productId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProducts"] });
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
      navigation.goBack();
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.centeredColumn}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.title}>{productId ? "Edit product" : "New product"}</Text>
        </View>

        <View style={styles.card}>
          <FormInput label="Title" value={title} onChangeText={setTitle} />
          <FormInput label="Description" value={description} onChangeText={setDescription} multiline />
          <View style={styles.twoCol}>
            <View style={styles.twoColItem}>
              <FormInput label="Price (NGN)" value={price} onChangeText={setPrice} keyboardType="numeric" />
            </View>
            <View style={styles.twoColItem}>
              <FormInput label="Stock" value={stock} onChangeText={setStock} keyboardType="numeric" />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Photos</Text>
          <View style={styles.photoRow}>
            {images.map((uri) => (
              <View key={uri} style={styles.thumbnailWrap}>
                <Image source={{ uri }} style={styles.thumbnail} />
                <Pressable
                  style={styles.removeBadge}
                  onPress={() => setImages((prev) => prev.filter((img) => img !== uri))}
                >
                  <Text style={styles.removeBadgeText}>×</Text>
                </Pressable>
              </View>
            ))}
            <Pressable
              style={[styles.addPhotoButton, uploading && styles.disabled]}
              onPress={handleAddPhoto}
              disabled={uploading}
            >
              <Ionicons name="camera" size={20} color="#6B7280" />
              <Text style={styles.addPhotoText}>{uploading ? "Uploading…" : "Add photo"}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.chipRow}>
            {(categoriesQuery.data ?? []).map((category) => (
              <Pressable
                key={category.id}
                style={[
                  styles.chip,
                  categoryId === category.id && { backgroundColor: theme.primaryColor },
                ]}
                onPress={() => setCategoryId(category.id)}
              >
                <Text style={[styles.chipText, categoryId === category.id && styles.chipTextActive]}>
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Status</Text>
          <View style={styles.chipRow}>
            {[ProductStatus.DRAFT, ProductStatus.ACTIVE, ProductStatus.ARCHIVED].map((s) => (
              <Pressable
                key={s}
                style={[styles.chip, status === s && { backgroundColor: theme.primaryColor }]}
                onPress={() => setStatus(s)}
              >
                <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <PrimaryButton
          title="Save product"
          onPress={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
          disabled={!title || !description || !price || !stock || !categoryId || images.length === 0}
        />

        {productId && (
          <View style={styles.deleteButtonWrap}>
            <PrimaryButton
              title="Delete product"
              variant="danger"
              onPress={() =>
                Alert.alert("Delete product", "This cannot be undone.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate() },
                ])
              }
              loading={deleteMutation.isPending}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { paddingTop: 60, paddingBottom: 32 },
  centeredColumn: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "800", color: "#111827" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  twoCol: { flexDirection: "row", gap: 12 },
  twoColItem: { flex: 1 },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 10 },
  sectionLabelSpaced: { marginTop: 16 },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  thumbnailWrap: { position: "relative" },
  thumbnail: { width: 76, height: 76, borderRadius: 10, backgroundColor: "#F0FDF4" },
  removeBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBadgeText: { color: "#fff", fontSize: 14, fontWeight: "700", lineHeight: 16 },
  addPhotoButton: {
    width: 76,
    height: 76,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 4,
  },
  addPhotoText: { fontSize: 10, color: "#6B7280", textAlign: "center", fontWeight: "600" },
  disabled: { opacity: 0.5 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F3F4F6" },
  chipText: { color: "#374151", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  deleteButtonWrap: { marginTop: 12 },
});
