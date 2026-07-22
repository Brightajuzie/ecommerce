import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProductStatus } from "@ikaystores/shared";
import { ProductsApi, CategoriesApi } from "../../api/endpoints";
import { pickAndUploadImage, ImagePickerCancelledError } from "../../api/upload";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import type { VendorStackParamList } from "../../navigation/types";

export function ProductFormScreen() {
  const route = useRoute<RouteProp<VendorStackParamList, "ProductForm">>();
  const navigation = useNavigation<NativeStackNavigationProp<VendorStackParamList>>();
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
      queryClient.invalidateQueries({ queryKey: ["myProducts"] });
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
      navigation.goBack();
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{productId ? "Edit product" : "New product"}</Text>

      <FormInput label="Title" value={title} onChangeText={setTitle} />
      <FormInput label="Description" value={description} onChangeText={setDescription} multiline />
      <FormInput label="Price (NGN)" value={price} onChangeText={setPrice} keyboardType="numeric" />
      <FormInput label="Stock" value={stock} onChangeText={setStock} keyboardType="numeric" />

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
          <Text style={styles.addPhotoText}>{uploading ? "Uploading…" : "+ Add photo"}</Text>
        </Pressable>
      </View>

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

      <Text style={styles.sectionLabel}>Status</Text>
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

      <PrimaryButton
        title="Save product"
        onPress={() => saveMutation.mutate()}
        loading={saveMutation.isPending}
        disabled={!title || !description || !price || !stock || !categoryId || images.length === 0}
      />

      {productId && (
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
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingTop: 60, gap: 4 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 16 },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 8 },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  thumbnailWrap: { position: "relative" },
  thumbnail: { width: 72, height: 72, borderRadius: 8, backgroundColor: "#E5E7EB" },
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
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  addPhotoText: { fontSize: 11, color: "#6B7280", textAlign: "center", fontWeight: "600" },
  disabled: { opacity: 0.5 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F3F4F6" },
  chipText: { color: "#374151", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
});
