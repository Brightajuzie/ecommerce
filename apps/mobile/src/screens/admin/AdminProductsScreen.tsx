import { useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { ProductStatus } from "@ikaystores/shared";
import type { AdminProductDto } from "@ikaystores/shared";
import { AdminProductsApi } from "../../api/endpoints";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { optimizedImageUrl } from "../../utils/image";
import type { AdminStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 800;

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
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
    centeredColumn: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const, paddingHorizontal: 16 },
    title: { fontSize: 26, fontWeight: "800" as const, color: colors.text, marginBottom: 16 },
    searchWrap: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 12,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    search: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },
    loading: { marginTop: 40 },
    list: { paddingBottom: 24 },
    empty: { alignItems: "center" as const, marginTop: 40, gap: 8 },
    emptyText: { color: colors.textMuted },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    image: { width: 52, height: 52, borderRadius: 8, backgroundColor: colors.placeholderBg },
    rowBody: { flex: 1 },
    rowTitle: { fontSize: 15, fontWeight: "700" as const, color: colors.text },
    rowVendor: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    rowPrice: { fontSize: 13, color: colors.textSecondary, marginTop: 2, fontWeight: "600" as const },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" as const },
  }));

  const productsQuery = useQuery({
    queryKey: ["adminProducts", search],
    queryFn: () => AdminProductsApi.browse({ search: search || undefined, pageSize: 50 }),
  });

  return (
    <View style={styles.container}>
      <View style={styles.centeredColumn}>
        <Text style={styles.title}>Products</Text>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={theme.colors.textFaint} />
          <TextInput
            style={styles.search}
            placeholder="Search products..."
            placeholderTextColor={theme.colors.textFaint}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {productsQuery.isLoading ? (
        <ActivityIndicator style={styles.loading} color={theme.primaryColor} />
      ) : (
        <FlatList
          data={productsQuery.data?.data ?? []}
          keyExtractor={(item: AdminProductDto) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centeredColumn}>
              <View style={styles.empty}>
                <Ionicons name="cube-outline" size={32} color={theme.colors.textFaint} />
                <Text style={styles.emptyText}>No products found.</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.centeredColumn}>
              <Pressable
                style={styles.row}
                onPress={() => navigation.navigate("ProductForm", { productId: item.id })}
              >
                <Image source={{ uri: optimizedImageUrl(item.images[0], 110) }} style={styles.image} />
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
            </View>
          )}
        />
      )}
    </View>
  );
}
