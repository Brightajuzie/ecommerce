import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { ProductStatus } from "@ikaystores/shared";
import type { ProductDto } from "@ikaystores/shared";
import { ProductsApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import type { VendorStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 900;

const STATUS_STYLES: Record<ProductStatus, { bg: string; fg: string }> = {
  [ProductStatus.ACTIVE]: { bg: "#DCFCE7", fg: "#15803D" },
  [ProductStatus.DRAFT]: { bg: "#F3F4F6", fg: "#6B7280" },
  [ProductStatus.ARCHIVED]: { bg: "#FEE2E2", fg: "#B91C1C" },
};

export function MyProductsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<VendorStackParamList>>();
  const theme = useTheme();
  const productsQuery = useQuery({ queryKey: ["myProducts"], queryFn: ProductsApi.listMine });

  return (
    <View style={styles.container}>
      <View style={styles.centeredColumn}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>My products</Text>
            <Text style={styles.subtitle}>
              {productsQuery.data?.length
                ? `${productsQuery.data.length} product${productsQuery.data.length === 1 ? "" : "s"} listed`
                : "Manage what you sell"}
            </Text>
          </View>
          <PrimaryButton title="+ New" onPress={() => navigation.navigate("ProductForm", undefined)} />
        </View>
      </View>

      {productsQuery.isLoading ? (
        <ActivityIndicator style={styles.loading} color={theme.primaryColor} />
      ) : (
        <FlatList
          data={productsQuery.data ?? []}
          keyExtractor={(item: ProductDto) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No products yet</Text>
              <Text style={styles.emptyText}>Tap "+ New" above to list your first product.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusStyle = STATUS_STYLES[item.status];
            const outOfStock = item.stock === 0;
            return (
              <View style={styles.centeredColumn}>
                <Pressable
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                  onPress={() => navigation.navigate("ProductForm", { productId: item.id })}
                >
                  <Image source={{ uri: item.images[0] }} style={styles.thumbnail} />
                  <View style={styles.cardBody}>
                    <Text numberOfLines={1} style={styles.productTitle}>
                      {item.title}
                    </Text>
                    <Text style={[styles.productPrice, { color: theme.primaryColor }]}>
                      {item.currency} {Number(item.price).toLocaleString()}
                    </Text>
                    <View style={styles.metaRow}>
                      <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusPillText, { color: statusStyle.fg }]}>{item.status}</Text>
                      </View>
                      <Text style={[styles.stockText, outOfStock && styles.stockTextEmpty]}>
                        {outOfStock ? "Out of stock" : `${item.stock} in stock`}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", paddingTop: 60 },
  centeredColumn: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", paddingHorizontal: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  title: { fontSize: 26, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  loading: { marginTop: 40 },
  list: { paddingBottom: 32 },
  empty: { alignItems: "center", marginTop: 60, gap: 6, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 4 },
  emptyText: { color: "#6B7280", textAlign: "center", fontSize: 13 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardPressed: { opacity: 0.9 },
  thumbnail: { width: 64, height: 64, borderRadius: 10, backgroundColor: "#F0FDF4" },
  cardBody: { flex: 1 },
  productTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  productPrice: { fontSize: 14, fontWeight: "800", marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusPillText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  stockText: { fontSize: 12, color: "#6B7280" },
  stockTextEmpty: { color: "#DC2626", fontWeight: "700" },
});
