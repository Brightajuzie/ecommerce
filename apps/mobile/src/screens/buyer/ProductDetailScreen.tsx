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
import { useGuestCartStore } from "../../store/guestCartStore";
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
  const guestAddItem = useGuestCartStore((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: 100 },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    centeredColumn: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const },
    imageWrap: {
      alignItems: "center" as const,
      paddingTop: 16,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    imageBox: {
      position: "relative" as const,
      width: "100%" as const,
      maxWidth: 360,
      borderRadius: 20,
      overflow: "hidden" as const,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity + 0.04,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
      marginBottom: 16,
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
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
    },
    badgeNew: { top: 12, left: 12 },
    badgeStock: { top: 12, right: 12, backgroundColor: colors.danger },
    badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" as const },
    body: { padding: 20 },
    metaRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, marginBottom: 12 },
    metaChip: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    metaChipText: { fontSize: 12, fontWeight: "700" as const },
    metaChipTextMuted: { fontSize: 12, fontWeight: "700" as const, color: colors.textMuted },
    title: { fontSize: 24, fontWeight: "800" as const, color: colors.text, lineHeight: 30 },
    priceRow: { flexDirection: "row" as const, alignItems: "baseline" as const, gap: 8, marginTop: 8 },
    price: { fontSize: 24, fontWeight: "900" as const },
    descriptionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginTop: 16,
    },
    descriptionTitle: { fontSize: 14, fontWeight: "800" as const, color: colors.text, marginBottom: 6 },
    description: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
    stockRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, marginTop: 12 },
    stockText: { fontSize: 13, fontWeight: "600" as const },
    stepperCard: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginTop: 16,
    },
    stepperLabel: { fontSize: 14, fontWeight: "700" as const, color: colors.text },
    stepperWrap: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      padding: 4,
    },
    stepButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surface,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 2,
      elevation: 1,
    },
    quantityText: { fontSize: 16, fontWeight: "800" as const, minWidth: 28, textAlign: "center" as const, color: colors.text },
    bottomBar: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 20,
      paddingVertical: 14,
      marginTop: 20,
      borderRadius: 16,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity + 0.03,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: -2 },
    },
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
    setShowAddedAlert(false);
    if (!user) {
      // Guests get a real local cart (see guestCartStore) instead of being
      // forced to sign in here — checkout is what asks for an account (see
      // CartScreen -> GuestCheckoutScreen), not adding an item to look at.
      if (productQuery.data) {
        guestAddItem(productQuery.data, quantity);
        setShowAddedAlert(true);
      }
      return;
    }
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

          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: theme.primaryColor }]}>
              {product.currency} {Number(product.price).toLocaleString()}
            </Text>
          </View>

          <View style={styles.stockRow}>
            <Ionicons
              name={product.stock > 0 ? "checkmark-circle" : "close-circle"}
              size={16}
              color={product.stock > 5 ? theme.colors.success : product.stock > 0 ? theme.colors.warning : theme.colors.danger}
            />
            <Text
              style={[
                styles.stockText,
                {
                  color:
                    product.stock > 5
                      ? theme.colors.success
                      : product.stock > 0
                      ? theme.colors.warning
                      : theme.colors.danger,
                },
              ]}
            >
              {product.stock > 0
                ? isLowStock
                  ? `Hurry, only ${product.stock} left in stock!`
                  : `${product.stock} items available`
                : "Currently unavailable"}
            </Text>
          </View>

          {product.description ? (
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionTitle}>About this item</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          ) : null}

          {product.stock > 0 && (
            <View style={styles.stepperCard}>
              <Text style={styles.stepperLabel}>Select quantity</Text>
              <View style={styles.stepperWrap}>
                <Pressable
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  style={styles.stepButton}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease quantity"
                  hitSlop={8}
                >
                  <Ionicons name="remove" size={18} color={theme.colors.text} />
                </Pressable>
                <Text style={styles.quantityText}>{quantity}</Text>
                <Pressable
                  onPress={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  style={styles.stepButton}
                  accessibilityRole="button"
                  accessibilityLabel="Increase quantity"
                  hitSlop={8}
                >
                  <Ionicons name="add" size={18} color={theme.colors.text} />
                </Pressable>
              </View>
            </View>
          )}

          <View style={{ marginTop: 24 }}>
            <PrimaryButton
              title={product.stock === 0 ? "Out of stock" : "Add to cart"}
              onPress={handleAddToCart}
              loading={addToCart.isPending}
              disabled={product.stock === 0}
              size="lg"
              leftIcon="cart-outline"
            />
          </View>
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
                  if (user) {
                    navigation.navigate("Checkout");
                  } else {
                    navigation.navigate("GuestCheckout", { redirectTo: "Checkout" });
                  }
                }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
