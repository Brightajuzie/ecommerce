import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, type CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { CategoryDto, ProductDto } from "@ikaystores/shared";
import { ProductsApi, CategoriesApi } from "../../api/endpoints";
import { AppDownloadBanner } from "../../components/AppDownloadBanner";
import { SlideCarousel } from "../../components/SlideCarousel";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { optimizedImageUrl } from "../../utils/image";
import type { BuyerStackParamList, BuyerTabParamList } from "../../navigation/types";

// Home is a tab screen but also navigates to stack-level screens (ProductDetail,
// Register) and sibling tabs (Orders) â€” a composite type is needed so both
// `navigate("Orders")` and `navigate("ProductDetail", {...})` type-check.
type HomeNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BuyerTabParamList>,
  NativeStackNavigationProp<BuyerStackParamList>
>;

const QUICK_ACTIONS: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  color: string;
  onPress: (navigation: HomeNavigationProp) => void;
}[] = [
  {
    label: "Become a Vendor",
    icon: "storefront",
    bg: "#EDE9FE",
    color: "#6D28D9",
    onPress: (navigation) => navigation.navigate("Register", undefined),
  },
  {
    label: "Track my orders",
    icon: "receipt",
    bg: "#FFEDD5",
    color: "#C2410C",
    onPress: (navigation) => navigation.navigate("Orders"),
  },
];

const NEW_PRODUCT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const LOW_STOCK_THRESHOLD = 5;
const MAX_CONTENT_WIDTH = 1200;
const PRODUCTS_PAGE_SIZE = 24;

function columnsForWidth(width: number): number {
  if (width >= 1200) return 5;
  if (width >= 900) return 4;
  if (width >= 640) return 3;
  return 2;
}

const CATEGORY_ICONS: { match: RegExp; icon: keyof typeof Ionicons.glyphMap }[] = [
  { match: /rice|grain/i, icon: "basket" },
  { match: /bean|legume/i, icon: "leaf" },
  { match: /garri|swallow|flour/i, icon: "restaurant" },
  { match: /spice|season/i, icon: "flame" },
  { match: /oil|cooking/i, icon: "water" },
  { match: /snack|beverage/i, icon: "fast-food" },
  { match: /canned|packaged/i, icon: "cube" },
  { match: /fresh|produce/i, icon: "nutrition" },
  { match: /household|essential/i, icon: "home" },
];

function iconForCategory(name: string): keyof typeof Ionicons.glyphMap {
  return CATEGORY_ICONS.find((c) => c.match.test(name))?.icon ?? "pricetag";
}

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigationProp>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const numColumns = columnsForWidth(windowWidth);
  const cardMaxWidthPercent = 100 / numColumns - (numColumns > 2 ? 1.5 : 3);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background },
    hero: {
      paddingHorizontal: 16,
      paddingBottom: 22,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    heroInner: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const },
    heroTop: { marginBottom: 14 },
    tagline: { color: "#fff", fontSize: 16, fontWeight: "700" as const },
    searchBar: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.text, padding: 0 },
    quickActions: {
      flexDirection: "row" as const,
      flexShrink: 0,
      paddingHorizontal: 16,
      marginTop: 14,
      gap: 10,
    },
    quickActionCard: {
      flexGrow: 1,
      flexBasis: 0,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 14,
      borderRadius: 14,
    },
    quickActionText: { fontWeight: "700" as const, fontSize: 12, flexShrink: 1 },
    categoryGrid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      flexShrink: 0,
      justifyContent: "flex-start" as const,
      paddingHorizontal: 16,
      marginTop: 18,
      marginBottom: 6,
      gap: 14,
    },
    productList: { flex: 1 },
    categoryTile: { width: 76, alignItems: "center" as const },
    categoryIconBox: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: 6,
    },
    categoryTileText: { fontWeight: "600" as const, fontSize: 11, color: colors.textSecondary, textAlign: "center" as const },
    loading: { marginTop: 40 },
    loadingMore: { marginVertical: 20 },
    sectionHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingHorizontal: 16,
      marginTop: 8,
      marginBottom: 10,
    },
    sectionHeaderText: { fontSize: 16, fontWeight: "800" as const, flex: 1 },
    seeAll: { flexDirection: "row" as const, alignItems: "center" as const, gap: 2 },
    seeAllText: { fontSize: 12, fontWeight: "700" as const },
    grid: { paddingBottom: 24, paddingHorizontal: 10, width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const },
    groupedList: { paddingBottom: 24, width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const },
    categorySection: { marginBottom: 12 },
    categoryRowContent: { paddingHorizontal: 12, gap: 4 },
    card: {
      flex: 1,
      margin: 6,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 10,
      maxWidth: "47%" as const,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    rowCard: { flexGrow: 0, flexShrink: 0, flexBasis: 150, width: 150, maxWidth: 150 },
    cardImageWrap: { position: "relative" as const, marginBottom: 8 },
    cardImage: { width: "100%" as const, aspectRatio: 1, borderRadius: 12, backgroundColor: colors.placeholderBg },
    badge: {
      position: "absolute" as const,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 8,
    },
    badgeNew: { top: 6, left: 6 },
    badgeStock: { top: 6, right: 6, backgroundColor: colors.danger },
    badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" as const },
    cardTitle: { fontSize: 14, fontWeight: "700" as const, color: colors.text },
    cardPrice: { fontSize: 14, fontWeight: "800" as const, marginTop: 3 },
    empty: { alignItems: "center" as const, marginTop: 60, gap: 8 },
    emptyText: { color: colors.textMuted },
  }));

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: CategoriesApi.list,
  });

  const productsQuery = useInfiniteQuery({
    queryKey: ["products", search, categoryId],
    queryFn: ({ pageParam }) =>
      ProductsApi.browse({
        search: search || undefined,
        categoryId,
        page: pageParam,
        pageSize: PRODUCTS_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
  });

  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((p) => p.data) ?? [],
    [productsQuery.data],
  );
  const categories = categoriesQuery.data ?? [];

  const loadMoreProducts = () => {
    if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
      productsQuery.fetchNextPage();
    }
  };

  // With no active filter, group the full catalog into per-category rows
  // (grocery-app style browsing); a selected category or search term instead
  // shows a single flat grid of just those results.
  const isFiltering = Boolean(search || categoryId);

  const productsByCategory = useMemo(() => {
    const grouped = new Map<string, ProductDto[]>();
    for (const product of products) {
      const list = grouped.get(product.categoryId);
      if (list) {
        list.push(product);
      } else {
        grouped.set(product.categoryId, [product]);
      }
    }
    return categories
      .map((category) => ({ category, items: grouped.get(category.id) ?? [] }))
      .filter((section) => section.items.length > 0);
  }, [products, categories]);

  // Rendered inside both FlatLists' ListHeaderComponent (not as a static
  // sibling of the hero) so it scrolls away with the rest of the content â€”
  // only the search header stays pinned above the list.
  const categoryGridElement = (
    <View style={styles.categoryGrid}>
      {categories.map((item: CategoryDto) => {
        const active = categoryId === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => setCategoryId(active ? undefined : item.id)}
            style={styles.categoryTile}
          >
            <View
              style={[
                styles.categoryIconBox,
                { backgroundColor: active ? theme.primaryColor : theme.accentColor ?? "#F0FDF4" },
              ]}
            >
              <Ionicons
                name={iconForCategory(item.name)}
                size={24}
                color={active ? "#fff" : theme.primaryColor}
              />
            </View>
            <Text numberOfLines={2} style={styles.categoryTileText}>
              {item.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderProductCard = (item: ProductDto, cardStyle: object, imageWidth = 400) => {
    const isNew = Date.now() - new Date(item.createdAt).getTime() < NEW_PRODUCT_WINDOW_MS;
    const isLowStock = item.stock > 0 && item.stock <= LOW_STOCK_THRESHOLD;
    return (
      <Pressable
        key={item.id}
        style={[styles.card, cardStyle]}
        onPress={() => navigation.navigate("ProductDetail", { productId: item.id })}
      >
        <View style={styles.cardImageWrap}>
          <Image source={{ uri: optimizedImageUrl(item.images[0], imageWidth) }} style={styles.cardImage} />
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
  };

  return (
    <View style={styles.container}>
      {/* Flat, exactly theme.primaryColor â€” same as the nav bar directly
          above it, so the two read as one continuous brand-green block
          instead of a bar-then-gradient seam. */}
      <View style={[styles.hero, { backgroundColor: theme.primaryColor, paddingTop: insets.top + 14 }]}>
        <View style={styles.heroInner}>
          {/* No logo here â€” the nav bar directly above already shows it
              (same brand-green background), so repeating it would just be
              a redundant "logo, then logo again" right at the top. */}
          <View style={styles.heroTop}>
            <Text style={styles.tagline}>Fresh finds, everyday prices ðŸŒ¿</Text>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={theme.colors.textFaint} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor={theme.colors.textFaint}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={theme.colors.textFaint} />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <View style={styles.quickActions}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.label}
            style={[styles.quickActionCard, { backgroundColor: action.bg }]}
            onPress={() => action.onPress(navigation)}
          >
            <Ionicons name={action.icon} size={18} color={action.color} />
            <Text style={[styles.quickActionText, { color: action.color }]}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      {productsQuery.isLoading ? (
        <ActivityIndicator style={styles.loading} color={theme.primaryColor} />
      ) : isFiltering ? (
        <FlatList
          key={numColumns}
          style={styles.productList}
          data={products}
          keyExtractor={(item: ProductDto) => item.id}
          numColumns={numColumns}
          contentContainerStyle={styles.grid}
          ListHeaderComponent={
            <>
              {categoryGridElement}
              <View style={styles.sectionHeader}>
                <Ionicons name="leaf" size={16} color={theme.primaryColor} />
                <Text style={[styles.sectionHeaderText, { color: theme.primaryColor }]}>
                  {search ? `Results for "${search}"` : categories.find((c) => c.id === categoryId)?.name ?? "Products"}
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
          renderItem={({ item }) => renderProductCard(item, { maxWidth: `${cardMaxWidthPercent}%` }, 500)}
          onEndReached={loadMoreProducts}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            productsQuery.isFetchingNextPage ? (
              <ActivityIndicator style={styles.loadingMore} color={theme.primaryColor} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="leaf-outline" size={32} color={theme.colors.textFaint} />
              <Text style={styles.emptyText}>No products found.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          style={styles.productList}
          data={productsByCategory}
          keyExtractor={(section) => section.category.id}
          contentContainerStyle={styles.groupedList}
          ListHeaderComponent={
            <>
              {categoryGridElement}
              <SlideCarousel />
              <AppDownloadBanner />
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
          renderItem={({ item: section }) => (
            <View style={styles.categorySection}>
              <Pressable
                style={styles.sectionHeader}
                onPress={() => setCategoryId(section.category.id)}
              >
                <Ionicons name={iconForCategory(section.category.name)} size={16} color={theme.primaryColor} />
                <Text style={[styles.sectionHeaderText, { color: theme.primaryColor }]}>
                  {section.category.name}
                </Text>
                <View style={styles.seeAll}>
                  <Text style={[styles.seeAllText, { color: theme.primaryColor }]}>See all</Text>
                  <Ionicons name="chevron-forward" size={14} color={theme.primaryColor} />
                </View>
              </Pressable>
              <FlatList
                horizontal
                data={section.items}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRowContent}
                renderItem={({ item }) => renderProductCard(item, styles.rowCard, 300)}
              />
            </View>
          )}
          onEndReached={loadMoreProducts}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            productsQuery.isFetchingNextPage ? (
              <ActivityIndicator style={styles.loadingMore} color={theme.primaryColor} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="leaf-outline" size={32} color={theme.colors.textFaint} />
              <Text style={styles.emptyText}>No products found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

