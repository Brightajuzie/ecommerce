import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { UserRole } from "@ikaystores/shared";
import { ProductsApi, CategoriesApi, NotificationsApi } from "../../api/endpoints";
import { AppDownloadBanner } from "../../components/AppDownloadBanner";
import { FloatingProduce } from "../../components/FloatingProduce";
import { Footer } from "../../components/Footer";
import { Skeleton, ProductCardSkeleton } from "../../components/SkeletonLoader";
import { SlideCarousel } from "../../components/SlideCarousel";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { optimizedImageUrl } from "../../utils/image";
import type { BuyerStackParamList, BuyerTabParamList } from "../../navigation/types";

// Home is a tab screen but also navigates to stack-level screens (ProductDetail,
// Register) and sibling tabs (Orders) — a composite type is needed so both
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

// The catalogue "logo" is a dedicated icon badge (not a photo/brand mark) —
// consistent with how the other quick actions above are icon-led rather
// than image-led, and instant to theme/re-color without an asset.
const CATALOGUE_ICON = "grid" as const;
const CATALOGUE_BG = "#DBEAFE";
const CATALOGUE_COLOR = "#1D4ED8";

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
  const user = useAuthStore((s) => s.user);
  const viewAsBuyer = useAuthStore((s) => s.viewAsBuyer);
  const setViewAsBuyer = useAuthStore((s) => s.setViewAsBuyer);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const numColumns = columnsForWidth(windowWidth);
  const cardMaxWidthPercent = 100 / numColumns - (numColumns > 2 ? 1.5 : 3);

  // Raw search value drives the input; debounced value drives the query so
  // we don't fire an API request on every single keystroke.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputRef = useRef<TextInput>(null);
  const submitSearch = () => searchInputRef.current?.blur();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  // "Browse Catalogue" forces the flat, all-products grid even with no
  // search term or category selected — otherwise that empty-filter state
  // would fall through to the grouped-by-category view further down.
  const [catalogueMode, setCatalogueMode] = useState(false);

  const isAdmin =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.EDITOR;
  const isVendor = user?.role === UserRole.VENDOR;

  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background },
    // Admin mode banner — shown above the hero when admin views the storefront.
    adminBar: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    adminBarText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.text,
    },
    adminBarButton: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: theme.primaryColor,
    },
    adminBarButtonText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "700" as const,
    },
    hero: {
      position: "relative" as const,
      overflow: "hidden" as const,
      paddingHorizontal: 16,
      paddingBottom: 22,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    heroInner: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const },
    heroTop: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginBottom: 14,
    },
    tagline: { color: "#fff", fontSize: 16, fontWeight: "700" as const, flexShrink: 1 },
    themeToggle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: "rgba(255,255,255,0.18)",
      marginLeft: 10,
    },
    signInButton: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      backgroundColor: "rgba(255,255,255,0.22)",
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginLeft: 10,
      gap: 5,
    },
    signInText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "600" as const,
    },
    headerActions: { flexDirection: "row" as const, alignItems: "center" as const },
    notificationDot: {
      position: "absolute" as const,
      top: 6,
      right: 6,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.danger,
      borderWidth: 1.5,
      borderColor: theme.primaryColor,
    },
    // Responsive search bar: full width on small screens, capped at 680 px
    // and centered on wider layouts — no more cramped 70% on a 375 px phone.
    searchBar: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      alignSelf: "center" as const,
      width: "100%" as const,
      maxWidth: 680,
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
      flexWrap: "wrap" as const,
      alignSelf: "center" as const,
      width: "100%" as const,
      maxWidth: 680,
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
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity + 0.02,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
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
    categoryTilePressed: { opacity: 0.6 },
    categoryIconBox: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: 6,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
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
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      maxWidth: "47%" as const,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity + 0.01,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    rowCard: { flexGrow: 0, flexShrink: 0, flexBasis: 150, width: 150, maxWidth: 150 },
    cardImageWrap: { position: "relative" as const, marginBottom: 8 },
    cardImage: { width: "100%" as const, aspectRatio: 1, borderRadius: 14, backgroundColor: colors.placeholderBg },
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
    errorCard: {
      alignItems: "center" as const,
      marginTop: 60,
      marginHorizontal: 24,
      gap: 12,
      padding: 24,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    errorText: { color: colors.textMuted, textAlign: "center" as const, lineHeight: 20 },
    retryButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: theme.primaryColor,
    },
    retryButtonText: { color: "#fff", fontWeight: "700" as const, fontSize: 14 },
  }));

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: CategoriesApi.list,
  });

  const unreadNotificationsQuery = useQuery({
    queryKey: ["notificationsUnreadCount"],
    queryFn: NotificationsApi.unreadCountMine,
    enabled: !!user,
    refetchInterval: 15000,
  });

  // debouncedSearch drives the query key — prevents an API call on every
  // keystroke while still feeling instant once the user pauses typing.
  const productsQuery = useInfiniteQuery({
    queryKey: ["products", debouncedSearch, categoryId],
    queryFn: ({ pageParam }) =>
      ProductsApi.browse({
        search: debouncedSearch || undefined,
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

  const loadMoreProducts = useCallback(() => {
    if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
      productsQuery.fetchNextPage();
    }
  }, [productsQuery]);

  // With no active filter, group the full catalog into per-category rows
  // (grocery-app style browsing); a selected category, search term, or the
  // "Browse Catalogue" quick action instead shows a single flat grid.
  // Use debouncedSearch so the view doesn't switch layout mid-keystroke.
  const isFiltering = Boolean(debouncedSearch || categoryId || catalogueMode);

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setCategoryId(undefined);
    setCatalogueMode(false);
  };

  // The nav bar's logo presses the Home tab via the same tabPress mechanism
  // as a real tap on the "Home" tab item (see ResponsiveTabBar's Brand
  // button) — React Navigation delivers that event here regardless of
  // whether Home is already focused, so this is what makes "click the logo"
  // actually take you back to a clean, unfiltered Home rather than leaving
  // whatever search/category/catalogue state was active untouched.
  useEffect(() => {
    return navigation.addListener("tabPress", () => {
      clearFilters();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

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
  // sibling of the hero) so it scrolls away with the rest of the content —
  // only the search header stays pinned above the list.
  const categoryGridElement = (
    <View style={styles.categoryGrid}>
      {categories.map((item: CategoryDto) => {
        const active = categoryId === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => {
              setCatalogueMode(false);
              setCategoryId(active ? undefined : item.id);
            }}
            style={({ pressed }) => [styles.categoryTile, pressed && styles.categoryTilePressed]}
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
      {/* Admin mode banner — only shown when an admin is browsing the
          live storefront. Gives a clear visual cue they're in "view store"
          mode and offers a 1-tap escape back to the dashboard. */}
      {isAdmin && viewAsBuyer && (
        <View style={styles.adminBar}>
          <Ionicons name="shield-checkmark" size={16} color={theme.primaryColor} />
          <Text style={styles.adminBarText} numberOfLines={1}>
            👑 Admin Mode — viewing live store
          </Text>
          <Pressable
            style={styles.adminBarButton}
            onPress={() => setViewAsBuyer(false)}
            accessibilityRole="button"
            accessibilityLabel="Go to Admin Dashboard"
          >
            <Ionicons name="grid" size={14} color="#fff" />
            <Text style={styles.adminBarButtonText}>Dashboard</Text>
          </Pressable>
        </View>
      )}

      {/* Flat, exactly theme.primaryColor — same as the nav bar directly
          above it, so the two read as one continuous brand-green block
          instead of a bar-then-gradient seam. */}
      <View style={[styles.hero, { backgroundColor: theme.primaryColor, paddingTop: insets.top + 14 }]}>
        {/* Decorative drifting leaves/fruit, behind everything else in the
            hero — purely atmospheric, never intercepts taps. */}
        <FloatingProduce />
        <View style={styles.heroInner}>
          {/* No logo here — the nav bar directly above already shows it
              (same brand-green background), so repeating it would just be
              a redundant "logo, then logo again" right at the top. */}
          <View style={styles.heroTop}>
            <Text style={styles.tagline}>Fresh finds, everyday prices 🌿</Text>
            <View style={styles.headerActions}>
              {/* Guests have no account yet (see AuthService.guestCheckout),
                  so there's nowhere for a personal notification to live
                  until checkout creates one — hidden rather than shown
                  empty. */}
              {user ? (
                <Pressable
                  onPress={() => navigation.navigate("Notifications")}
                  hitSlop={8}
                  style={styles.themeToggle}
                >
                  <Ionicons name="notifications" size={18} color="#fff" />
                  {(unreadNotificationsQuery.data ?? 0) > 0 && (
                    <View style={styles.notificationDot} />
                  )}
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => navigation.navigate("Login")}
                  hitSlop={8}
                  style={styles.signInButton}
                  accessibilityRole="button"
                  accessibilityLabel="Sign in"
                >
                  <Ionicons name="log-in-outline" size={15} color="#fff" />
                  <Text style={styles.signInText}>Sign in</Text>
                </Pressable>
              )}
              {/* Quick day/night switch, separate from the fuller Light/Dark/
                  System picker on Profile — tapping here always sets an
                  explicit mode (never "system"), since a single tap toggling
                  between exactly two states is the whole point of a switch. */}
              <Pressable
                onPress={() => theme.setMode(theme.scheme === "dark" ? "light" : "dark")}
                hitSlop={8}
                style={styles.themeToggle}
              >
                <Ionicons name={theme.scheme === "dark" ? "sunny" : "moon"} size={18} color="#fff" />
              </Pressable>
            </View>
          </View>

          <View style={styles.searchBar}>
            <Pressable onPress={submitSearch} hitSlop={8} accessibilityRole="button" accessibilityLabel="Search">
              <Ionicons name="search" size={18} color={theme.colors.textFaint} />
            </Pressable>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor={theme.colors.textFaint}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              onSubmitEditing={submitSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => { setSearch(""); setDebouncedSearch(""); }} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={theme.colors.textFaint} />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Pressable
          style={[styles.quickActionCard, { backgroundColor: CATALOGUE_BG }]}
          onPress={() => {
            setSearch("");
            setDebouncedSearch("");
            setCategoryId(undefined);
            setCatalogueMode(true);
          }}
        >
          <Ionicons name={CATALOGUE_ICON} size={18} color={CATALOGUE_COLOR} />
          <Text style={[styles.quickActionText, { color: CATALOGUE_COLOR }]}>Browse Catalogue</Text>
        </Pressable>

        {/* Role-aware secondary quick actions: admins get a 1-tap shortcut
            back to their dashboard; vendors get their vendor dashboard;
            buyers/guests get "Become a Vendor" as before. */}
        {isAdmin ? (
          <Pressable
            style={[styles.quickActionCard, { backgroundColor: "#EDE9FE" }]}
            onPress={() => setViewAsBuyer(false)}
          >
            <Ionicons name="grid" size={18} color="#6D28D9" />
            <Text style={[styles.quickActionText, { color: "#6D28D9" }]}>Admin Dashboard</Text>
          </Pressable>
        ) : isVendor ? (
          <Pressable
            style={[styles.quickActionCard, { backgroundColor: "#EDE9FE" }]}
            onPress={() => setViewAsBuyer(false)}
          >
            <Ionicons name="storefront" size={18} color="#6D28D9" />
            <Text style={[styles.quickActionText, { color: "#6D28D9" }]}>Vendor Dashboard</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.quickActionCard, { backgroundColor: "#EDE9FE" }]}
            onPress={() => navigation.navigate("Register", undefined)}
          >
            <Ionicons name="storefront" size={18} color="#6D28D9" />
            <Text style={[styles.quickActionText, { color: "#6D28D9" }]}>Become a Vendor</Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.quickActionCard, { backgroundColor: "#FFEDD5" }]}
          onPress={() => navigation.navigate("Orders")}
        >
          <Ionicons name="receipt" size={18} color="#C2410C" />
          <Text style={[styles.quickActionText, { color: "#C2410C" }]}>Track my orders</Text>
        </Pressable>
      </View>

      {productsQuery.isLoading ? (
        <View style={[styles.grid, { flexDirection: "row", flexWrap: "wrap" }]}>
          {Array.from({ length: numColumns * 2 }).map((_, i) => (
            <ProductCardSkeleton
              key={i}
              style={{ maxWidth: `${cardMaxWidthPercent}%`, minWidth: 140 }}
            />
          ))}
        </View>
      ) : productsQuery.isError ? (
        <View style={styles.errorCard}>
          <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.textFaint} />
          <Text style={styles.errorText}>
            Couldn't load products. Check your connection and try again.
          </Text>
          <Pressable style={styles.retryButton} onPress={() => productsQuery.refetch()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
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
                <Ionicons name={catalogueMode && !debouncedSearch && !categoryId ? CATALOGUE_ICON : "leaf"} size={16} color={theme.primaryColor} />
                <Text style={[styles.sectionHeaderText, { color: theme.primaryColor }]}>
                  {debouncedSearch
                    ? `Results for "${debouncedSearch}"`
                    : categories.find((c) => c.id === categoryId)?.name ?? "Full catalogue"}
                </Text>
                <Pressable style={styles.seeAll} onPress={clearFilters}>
                  <Text style={[styles.seeAllText, { color: theme.primaryColor }]}>Back</Text>
                  <Ionicons name="close-circle" size={14} color={theme.primaryColor} />
                </Pressable>
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
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          ListFooterComponent={
            <>
              {productsQuery.isFetchingNextPage && (
                <ActivityIndicator style={styles.loadingMore} color={theme.primaryColor} />
              )}
              <Footer />
            </>
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
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          ListFooterComponent={
            <>
              {productsQuery.isFetchingNextPage && (
                <ActivityIndicator style={styles.loadingMore} color={theme.primaryColor} />
              )}
              <Footer />
            </>
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

