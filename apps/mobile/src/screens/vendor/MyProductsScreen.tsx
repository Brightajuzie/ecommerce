import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { ProductStatus } from "@ikaystores/shared";
import type { ProductDto } from "@ikaystores/shared";
import { ProductsApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { VendorStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 900;

const STATUS_STYLES_LIGHT: Record<ProductStatus, { bg: string; fg: string }> = {
  [ProductStatus.ACTIVE]: { bg: "#DCFCE7", fg: "#15803D" },
  [ProductStatus.DRAFT]: { bg: "#F3F4F6", fg: "#6B7280" },
  [ProductStatus.ARCHIVED]: { bg: "#FEE2E2", fg: "#B91C1C" },
};

const STATUS_STYLES_DARK: Record<ProductStatus, { bg: string; fg: string }> = {
  [ProductStatus.ACTIVE]: { bg: "#0F3D22", fg: "#4ADE80" },
  [ProductStatus.DRAFT]: { bg: "#212823", fg: "#9CA3AF" },
  [ProductStatus.ARCHIVED]: { bg: "#450A0A", fg: "#F87171" },
};

export function MyProductsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<VendorStackParamList>>();
  const theme = useTheme();
  const statusStyles = theme.scheme === "dark" ? STATUS_STYLES_DARK : STATUS_STYLES_LIGHT;
  const productsQuery = useQuery({ queryKey: ["myProducts"], queryFn: ProductsApi.listMine });
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
    centeredColumn: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const, paddingHorizontal: 16 },
    header: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 18 },
    title: { fontSize: 26, fontWeight: "800" as const, color: colors.text },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    loading: { marginTop: 40 },
    list: { paddingBottom: 32 },
    empty: { alignItems: "center" as const, marginTop: 60, gap: 6, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 16, fontWeight: "700" as const, color: colors.text, marginTop: 4 },
    emptyText: { color: colors.textMuted, textAlign: "center" as const, fontSize: 13 },
    card: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity + 0.01,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    cardPressed: { opacity: 0.9 },
    thumbnail: { width: 64, height: 64, borderRadius: 10, backgroundColor: colors.placeholderBg },
    cardBody: { flex: 1 },
    productTitle: { fontSize: 15, fontWeight: "700" as const, color: colors.text },
    productPrice: { fontSize: 14, fontWeight: "800" as const, marginTop: 2 },
    metaRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginTop: 6 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    statusPillText: { fontSize: 10, fontWeight: "800" as const, textTransform: "uppercase" as const },
    stockText: { fontSize: 12, color: colors.textMuted },
    stockTextEmpty: { color: colors.danger, fontWeight: "700" as const },
  }));

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
              <Ionicons name="cube-outline" size={32} color={theme.colors.textFaint} />
              <Text style={styles.emptyTitle}>No products yet</Text>
              <Text style={styles.emptyText}>Tap "+ New" above to list your first product.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusStyle = statusStyles[item.status];
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
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textFaint} />
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
