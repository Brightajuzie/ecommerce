import { useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProductsApi, CartApi, CategoriesApi, VendorsApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import { useAuthStore } from "../../store/authStore";
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
            <Image source={{ uri: product.images[0] }} style={styles.image} resizeMode="cover" />
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
                  <Ionicons name="storefront" size={12} color="#6B7280" />
                  <Text style={styles.metaChipTextMuted}>{vendor.businessName}</Text>
                </View>
              )}
              {product.weight && (
                <View style={styles.metaChip}>
                  <Ionicons name="scale" size={12} color="#6B7280" />
                  <Text style={styles.metaChipTextMuted}>{product.weight}</Text>
                </View>
              )}
              {product.brand && (
                <View style={styles.metaChip}>
                  <Ionicons name="ribbon" size={12} color="#6B7280" />
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
              <Ionicons name="checkmark-circle" size={22} color="#059669" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: {},
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centeredColumn: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
  imageWrap: { alignItems: "center", paddingTop: 16, backgroundColor: "#fff" },
  imageBox: { position: "relative", width: "55%", maxWidth: 220 },
  image: { width: "100%", aspectRatio: 1, borderRadius: 16, backgroundColor: "#F0FDF4" },
  badge: {
    position: "absolute",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeNew: { top: 12, left: 12 },
  badgeStock: { top: 12, right: 12, backgroundColor: "#DC2626" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  body: { padding: 20 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },
  metaChipText: { fontSize: 12, fontWeight: "700" },
  metaChipTextMuted: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  price: { fontSize: 20, fontWeight: "800", marginTop: 8 },
  description: { fontSize: 15, color: "#4B5563", marginTop: 12, lineHeight: 22 },
  stock: { fontSize: 13, color: "#6B7280", marginTop: 8 },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginVertical: 20,
  },
  quantity: { fontSize: 18, fontWeight: "700", minWidth: 30, textAlign: "center" },
  alertBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  alertCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  alertHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  alertTitle: { color: "#059669", fontWeight: "800", fontSize: 17 },
  alertBody: { color: "#374151", fontSize: 14, marginBottom: 18, lineHeight: 20 },
  alertActions: { flexDirection: "row", gap: 10 },
});
