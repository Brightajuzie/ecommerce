import { useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { ProductStatus } from "@ikaystores/shared";
import type { AdminProductDto } from "@ikaystores/shared";
import { AdminProductsApi } from "../../api/endpoints";
import { useTheme } from "../../theme/ThemeContext";
import type { AdminStackParamList } from "../../navigation/types";

const STATUS_COLORS: Record<ProductStatus, string> = {
  [ProductStatus.DRAFT]: "#9CA3AF",
  [ProductStatus.ACTIVE]: "#059669",
  [ProductStatus.ARCHIVED]: "#DC2626",
};

// Full edit access — tapping a row reuses the same ProductFormScreen
// vendors use for their own listings, since /products/:id now also
// accepts ADMIN/SUPER_ADMIN callers.
export function AdminProductsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const theme = useTheme();
  const [search, setSearch] = useState("");

  const productsQuery = useQuery({
    queryKey: ["adminProducts", search],
    queryFn: () => AdminProductsApi.browse({ search: search || undefined, pageSize: 50 }),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Products</Text>
      <TextInput
        style={styles.search}
        placeholder="Search products..."
        placeholderTextColor="#9CA3AF"
        value={search}
        onChangeText={setSearch}
      />

      {productsQuery.isLoading ? (
        <ActivityIndicator style={styles.loading} color={theme.primaryColor} />
      ) : (
        <FlatList
          data={productsQuery.data?.data ?? []}
          keyExtractor={(item: AdminProductDto) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No products found.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => navigation.navigate("ProductForm", { productId: item.id })}
            >
              <Image source={{ uri: item.images[0] }} style={styles.image} />
              <View style={styles.rowBody}>
                <Text numberOfLines={1} style={styles.rowTitle}>
                  {item.title}
                </Text>
                <Text style={styles.rowVendor}>{item.vendor.businessName}</Text>
                <Text style={styles.rowPrice}>
                  {item.currency} {Number(item.price).toLocaleString()} · {item.stock} in stock
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] }]}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 16 },
  search: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    marginBottom: 16,
  },
  loading: { marginTop: 40 },
  list: { paddingBottom: 24 },
  empty: { textAlign: "center", marginTop: 40, color: "#6B7280" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  image: { width: 52, height: 52, borderRadius: 8, backgroundColor: "#E5E7EB" },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  rowVendor: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  rowPrice: { fontSize: 13, color: "#374151", marginTop: 2, fontWeight: "600" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
