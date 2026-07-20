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
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import type { CategoryDto, ProductDto } from "@ikstore/shared";
import { ProductsApi, CategoriesApi } from "../../api/endpoints";
import { AppDownloadBanner } from "../../components/AppDownloadBanner";
import { SlideCarousel } from "../../components/SlideCarousel";
import { useTheme } from "../../theme/ThemeContext";
import type { BuyerStackParamList } from "../../navigation/types";

const NEW_PRODUCT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const LOW_STOCK_THRESHOLD = 5;
const MAX_CONTENT_WIDTH = 1200;

function columnsForWidth(width: number): number {
  if (width >= 1200) return 5;
  if (width >= 900) return 4;
  if (width >= 640) return 3;
  return 2;
}

const CATEGORY_ICONS: { match: RegExp; icon: keyof typeof Ionicons.glyphMap }[] = [
  { match: /grocer/i, icon: "nutrition" },
  { match: /food|beverage/i, icon: "fast-food" },
  { match: /electronic/i, icon: "hardware-chip" },
  { match: /fashion|cloth|wear/i, icon: "shirt" },
  { match: /home|living/i, icon: "home" },
];

function iconForCategory(name: string): keyof typeof Ionicons.glyphMap {
  return CATEGORY_ICONS.find((c) => c.match.test(name))?.icon ?? "pricetag";
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const numColumns = columnsForWidth(windowWidth);
  const cardMaxWidthPercent = 100 / numColumns - (numColumns > 2 ? 1.5 : 3);
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
  const categories = categoriesQuery.data ?? [];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.primaryColor, theme.secondaryColor]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 14 }]}
      >
        <View style={styles.heroInner}>
          <View style={styles.heroTop}>
            {theme.logoUrl ? (
              <Image source={{ uri: theme.logoUrl }} style={styles.logo} resizeMode="contain" />
            ) : (
              <View style={styles.brandRow}>
                <Ionicons name="leaf" size={22} color="#fff" />
                <Text style={styles.title}>IkStore</Text>
              </View>
            )}
            <Text style={styles.tagline}>Fresh finds, everyday prices 🌿</Text>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </Pressable>
            )}
          </View>
        </View>
      </LinearGradient>

      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item: CategoryDto) => item.id}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryList}
        contentContainerStyle={styles.categoryListContent}
        renderItem={({ item }) => {
          const active = categoryId === item.id;
          return (
            <Pressable
              onPress={() => setCategoryId(active ? undefined : item.id)}
              style={[
                styles.categoryChip,
                { backgroundColor: active ? theme.primaryColor : theme.accentColor ?? "#F0FDF4" },
              ]}
            >
              <Ionicons
                name={iconForCategory(item.name)}
                size={14}
                color={active ? "#fff" : theme.primaryColor}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  { color: active ? "#fff" : theme.primaryColor },
                ]}
              >
                {item.name}
              </Text>
            </Pressable>
          );
        }}
      />

      {productsQuery.isLoading ? (
        <ActivityIndicator style={styles.loading} color={theme.primaryColor} />
      ) : (
        <FlatList
          key={numColumns}
          data={products}
          keyExtractor={(item: ProductDto) => item.id}
          numColumns={numColumns}
          contentContainerStyle={styles.grid}
          ListHeaderComponent={
            <>
              <SlideCarousel />
              <AppDownloadBanner />
              <View style={styles.sectionHeader}>
                <Ionicons name="leaf" size={16} color={theme.primaryColor} />
                <Text style={[styles.sectionHeaderText, { color: theme.primaryColor }]}>
                  Fresh Picks For You
                </Text>
              </View>
            </>
          }
          refreshControl={
            <RefreshControl
              refreshing={productsQuery.isFetching}
              onRefresh={() => productsQuery.refetch()}
              tintColor={theme.primaryColor}
              colors={[theme.primaryColor]}
            />
          }
          renderItem={({ item }) => {
            const isNew = Date.now() - new Date(item.createdAt).getTime() < NEW_PRODUCT_WINDOW_MS;
            const isLowStock = item.stock > 0 && item.stock <= LOW_STOCK_THRESHOLD;
            return (
              <Pressable
                style={[styles.card, { maxWidth: `${cardMaxWidthPercent}%` }]}
                onPress={() => navigation.navigate("ProductDetail", { productId: item.id })}
              >
                <View style={styles.cardImageWrap}>
                  <Image source={{ uri: item.images[0] }} style={styles.cardImage} />
                  {isNew && (
                    <View style={[styles.badge, styles.badgeNew, { backgroundColor: theme.secondaryColor }]}>
                      <Text style={styles.badgeText}>NEW</Text>
                    </View>
                  )}
                  {isLowStock && (
                    <View style={[styles.badge, styles.badgeStock]}>
                      <Text style={styles.badgeText}>Only {item.stock} left</Text>
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} style={styles.cardTitle}>
                  {item.title}
                </Text>
                <Text style={[styles.cardPrice, { color: theme.primaryColor }]}>
                  {item.currency} {Number(item.price).toLocaleString()}
                </Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="leaf-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyText}>No products found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroInner: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
  heroTop: { marginBottom: 14 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 24, fontWeight: "800", color: "#fff" },
  tagline: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 4, fontWeight: "500" },
  logo: { height: 32, width: 150, marginBottom: 4, alignSelf: "flex-start" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827", padding: 0 },
  categoryList: { flexGrow: 0, marginTop: 14, marginBottom: 4 },
  categoryListContent: { paddingHorizontal: 16, gap: 8 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipText: { fontWeight: "700", fontSize: 13 },
  loading: { marginTop: 40 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionHeaderText: { fontSize: 16, fontWeight: "800" },
  grid: { paddingBottom: 24, paddingHorizontal: 10, width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 10,
    maxWidth: "47%",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardImageWrap: { position: "relative", marginBottom: 8 },
  cardImage: { width: "100%", aspectRatio: 1, borderRadius: 12, backgroundColor: "#F0FDF4" },
  badge: {
    position: "absolute",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeNew: { top: 6, left: 6 },
  badgeStock: { top: 6, right: 6, backgroundColor: "#DC2626" },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  cardPrice: { fontSize: 14, fontWeight: "800", marginTop: 3 },
  empty: { alignItems: "center", marginTop: 60, gap: 8 },
  emptyText: { color: "#6B7280" },
});
