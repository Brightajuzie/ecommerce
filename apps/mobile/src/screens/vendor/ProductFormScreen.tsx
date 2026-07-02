import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProductStatus } from "@ikstore/shared";
import { ProductsApi, CategoriesApi } from "../../api/endpoints";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import type { VendorStackParamList } from "../../navigation/types";

export function ProductFormScreen() {
  const route = useRoute<RouteProp<VendorStackParamList, "ProductForm">>();
  const navigation = useNavigation<NativeStackNavigationProp<VendorStackParamList>>();
  const queryClient = useQueryClient();
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
  const [imagesText, setImagesText] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [status, setStatus] = useState<ProductStatus>(ProductStatus.ACTIVE);

  useEffect(() => {
    if (productQuery.data) {
      const p = productQuery.data;
      setTitle(p.title);
      setDescription(p.description);
      setPrice(String(p.price));
      setStock(String(p.stock));
      setImagesText(p.images.join(", "));
      setCategoryId(p.categoryId);
      setStatus(p.status);
    }
  }, [productQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title,
        description,
        price: Number(price),
        currency: "NGN",
        stock: Number(stock),
        images: imagesText.split(",").map((s) => s.trim()).filter(Boolean),
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
      <FormInput
        label="Image URLs (comma-separated)"
        value={imagesText}
        onChangeText={setImagesText}
      />

      <Text style={styles.sectionLabel}>Category</Text>
      <View style={styles.chipRow}>
        {(categoriesQuery.data ?? []).map((category) => (
          <Pressable
            key={category.id}
            style={[styles.chip, categoryId === category.id && styles.chipActive]}
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
            style={[styles.chip, status === s && styles.chipActive]}
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
        disabled={!title || !description || !price || !stock || !categoryId}
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F3F4F6" },
  chipActive: { backgroundColor: "#111827" },
  chipText: { color: "#374151", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
});
