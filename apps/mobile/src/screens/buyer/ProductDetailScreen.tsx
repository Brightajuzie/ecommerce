import { useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProductsApi, CartApi, CategoriesApi, VendorsApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { useAuthStore } from "../../store/authStore";
import { optimizedImageUrl } from "../../utils/image";
import type { BuyerStackParamList } from "../../navigation/types";

const NEW_PRODUCT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const LOW_STOCK_THRESHOLD = 5;
const MAX_CONTENT_WIDTH = 800;

export function ProductDetailScreen() {
  const route = useRoute<RouteProp<BuyerStackParamList, "ProductDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const [quantity, setQuantity] = useState(1);
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.surface },
    scrollContent: {},
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    centeredColumn: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const },
    imageWrap: { alignItems: "center" as const, paddingTop: 16, backgroundColor: colors.surface },
    imageBox: {
      position: "relative" as const,
      width: "55%" as const,
      maxWidth: 220,
      borderRadius: 20,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity + 0.04,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    image: {
      width: "100%" as const,
      aspectRatio: 1,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.placeholderBg,
    },
    badge: {
      position: "absolute" as const,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    badgeNew: { top: 12, left: 12 },
    badgeStock: { top: 12, right: 12, backgroundColor: colors.danger },
    badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" as const },
    body: { padding: 20 },
    metaRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, marginBottom: 10 },
    metaChip: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    metaChipText: { fontSize: 12, fontWeight: "700" as const },
    metaChipTextMuted: { fontSize: 12, fontWeight: "700" as const, color: colors.textMuted },
    title: { fontSize: 22, fontWeight: "700" as const, color: colors.text },
    price: { fontSize: 20, fontWeight: "800" as const, marginTop: 8 },
    description: { fontSize: 15, color: colors.textSecondary, marginTop: 12, lineHeight: 22 },
    stock: { fontSize: 13, color: colors.textMuted, marginTop: 8 },
    quantityRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 20,
      marginVertical: 20,
    },
    quantity: { fontSize: 18, fontWeight: "700" as const, minWidth: 30, textAlign: "center" as const, color: colors.text },
    alertBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      padding: 24,
    },
    alertCard: {
      width: "100%" as const,
      maxWidth: 380,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity + 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    alertHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginBottom: 8 },
    alertTitle: { color: colors.success, fontWeight: "800" as const, fontSize: 17 },
    alertBody: { color: colors.textSecondary, fontSize: 14, marginBottom: 18, lineHeight: 20 },
    alertActions: { flexDirection: "row" as const, gap: 10 },
  }));

  const productQuery = useQuery({
    queryKey: ["product", route.params.productId],
    queryFn: () => ProductsApi.findOne(route.params.productId),
  });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: CategoriesApi.list });
  const vendorsQuery = useQuery({ queryKey: ["vendors"], queryFn: VendorsApi.listApproved });

  const [showAddedAlert, setShowAddedAlert] = useState(false);

  const addToCart = useMutation({
    mutationFn: () => CartApi.addItem({ productId: route.params.productId, quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      // Rendered as our own Modal rather than via Alert.alert (see
      // RegisterScreen for the same fix and why): on web, Alert.alert can be
      // silently suppressed by some mobile browsers, which would otherwise
      // leave a successful add-to-cart with no visible confirmation at all.
      setShowAddedAlert(true);
    },
    onError: (error: any) => {
      setShowAddedAlert(false);
      Alert.alert("Could not add to cart", error?.response?.data?.message ?? "Please try again.");
    },
  });

  const handleAddToCart = () => {
    if (!user) {
      navigation.navigate("Login", {
        pendingCartItem: { productId: route.params.productId, quantity },
      });
      return;
    }
    setShowAddedAlert(false);
    addToCart.mutate();
  };

  if (productQuery.isLoading || !productQuery.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primaryColor} />
      </View>
    );
  }

  const product = productQuery.data;
  const category = categoriesQuery.data?.find((c) => c.id === product.categoryId);
  const vendor = vendorsQuery.data?.find((v) => v.id === product.vendorId);
  const isNew = Date.now() - new Date(product.createdAt).getTime() < NEW_PRODUCT_WINDOW_MS;
  const isLowStock = product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.centeredColumn}>
        <View style={styles.imageWrap}>
          <View style={styles.imageBox}>
            <Image
              source={{ uri: optimizedImageUrl(product.images[0], 440) }}
              style={styles.image}
              resizeMode="cover"
            />
            {isNew && (
              <View style={[styles.badge, styles.badgeNew, { backgroundColor: theme.secondaryColor }]}>
                <Text style={styles.badgeText}>NEW</Text>
              </View>
            )}
            {isLowStock && (
              <View style={[styles.badge, styles.badgeStock]}>
                <Text style={styles.badgeText}>Only {product.stock} left</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.body}>
          {(category || vendor || product.weight || product.brand) && (
            <View style={styles.metaRow}>
              {category && (
                <View style={[styles.metaChip, { backgroundColor: theme.accentColor ?? "#F0FDF4" }]}>
                  <Ionicons name="pricetag" size={12} color={theme.primaryColor} />
                  <Text style={[styles.metaChipText, { color: theme.primaryColor }]}>{category.name}</Text>
                </View>
              )}
              {vendor && (
                <View style={styles.metaChip}>
                  <Ionicons name="storefront" size={12} color={theme.colors.textMuted} />
                  <Text style={styles.metaChipTextMuted}>{vendor.businessName}</Text>
                </View>
              )}
              {product.weight && (
                <View style={styles.metaChip}>
                  <Ionicons name="scale" size={12} color={theme.colors.textMuted} />
                  <Text style={styles.metaChipTextMuted}>{product.weight}</Text>
                </View>
              )}
              {product.brand && (
                <View style={styles.metaChip}>
                  <Ionicons name="ribbon" size={12} color={theme.colors.textMuted} />
                  <Text style={styles.metaChipTextMuted}>{product.brand}</Text>
                </View>
              )}
            </View>
          )}

          <Text style={styles.title}>{product.title}</Text>
          <Text style={[styles.price, { color: theme.primaryColor }]}>
            {product.currency} {Number(product.price).toLocaleString()}
          </Text>
          <Text style={styles.description}>{product.description}</Text>
          <Text style={styles.stock}>
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </Text>

          <View style={styles.quantityRow}>
            <PrimaryButton
              title="-"
              variant="secondary"
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            />
            <Text style={styles.quantity}>{quantity}</Text>
            <PrimaryButton
              title="+"
              variant="secondary"
              onPress={() => setQuantity((q) => Math.min(product.stock, q + 1))}
            />
          </View>

          <PrimaryButton
            title="Add to cart"
            onPress={handleAddToCart}
            loading={addToCart.isPending}
            disabled={product.stock === 0}
          />

        </View>
      </View>

      <Modal
        visible={showAddedAlert}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddedAlert(false)}
      >
        <Pressable style={styles.alertBackdrop} onPress={() => setShowAddedAlert(false)}>
          <Pressable style={styles.alertCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.alertHeader}>
              <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
              <Text style={styles.alertTitle}>Added to cart</Text>
            </View>
            <Text style={styles.alertBody}>
              {product.title} {quantity > 1 ? `x${quantity} ` : ""}is in your cart.
            </Text>
            <View style={styles.alertActions}>
              <PrimaryButton
                title="Continue shopping"
                variant="secondary"
                onPress={() => {
                  setShowAddedAlert(false);
                  navigation.navigate("BuyerTabs");
                }}
              />
              <PrimaryButton
                title="Checkout"
                onPress={() => {
                  setShowAddedAlert(false);
                  navigation.navigate("Checkout");
                }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
