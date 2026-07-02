import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import type { ProductDto } from "@ikstore/shared";
import { ProductsApi, CategoriesApi } from "../../api/endpoints";
import { SlideCarousel } from "../../components/SlideCarousel";
import { useTheme } from "../../theme/ThemeContext";
import type { BuyerStackParamList } from "../../navigation/types";

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: CategoriesApi.list,
  });

  const productsQuery = useQuery({
    queryKey: ["products", search, categoryId],
    queryFn: () => ProductsApi.browse({ search: search || undefined, categoryId }),
  });

  const products = productsQuery.data?.data ?? [];

  return (
    <View style={styles.container}>
      {theme.logoUrl ? (
        <Image source={{ uri: theme.logoUrl }} style={styles.logo} resizeMode="contain" />
      ) : (
        <Text style={styles.title}>IkStore</Text>
      )}

      <SlideCarousel />

      <TextInput
        style={styles.search}
        placeholder="Search products..."
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        horizontal
        data={categoriesQuery.data ?? []}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryList}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setCategoryId(categoryId === item.id ? undefined : item.id)}
            style={[
              styles.categoryChip,
              categoryId === item.id && { backgroundColor: theme.primaryColor },
            ]}
          >
            <Text
              style={[
                styles.categoryChipText,
                categoryId === item.id && styles.categoryChipTextActive,
              ]}
            >
              {item.name}
            </Text>
          </Pressable>
        )}
      />

      {productsQuery.isLoading ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item: ProductDto) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl
              refreshing={productsQuery.isFetching}
              onRefresh={() => productsQuery.refetch()}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("ProductDetail", { productId: item.id })}
            >
              <Image source={{ uri: item.images[0] }} style={styles.cardImage} />
              <Text numberOfLines={1} style={styles.cardTitle}>
                {item.title}
              </Text>
              <Text style={styles.cardPrice}>
                {item.currency} {Number(item.price).toLocaleString()}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No products found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 16 },
  logo: { height: 36, width: 160, marginBottom: 16, alignSelf: "flex-start" },
  search: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  categoryList: { flexGrow: 0, marginBottom: 12 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  categoryChipText: { color: "#374151", fontWeight: "600" },
  categoryChipTextActive: { color: "#fff" },
  loading: { marginTop: 40 },
  grid: { paddingBottom: 20 },
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 8,
    maxWidth: "47%",
  },
  cardImage: { width: "100%", aspectRatio: 1, borderRadius: 8, marginBottom: 8, backgroundColor: "#E5E7EB" },
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  cardPrice: { fontSize: 14, color: "#6B7280", marginTop: 2 },
  empty: { textAlign: "center", marginTop: 40, color: "#6B7280" },
});
