import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { CartItemDto } from "@ikaystores/shared";
import { CartApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import { CartItemSkeleton } from "../../components/SkeletonLoader";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { useAuthStore } from "../../store/authStore";
import { useGuestCartStore } from "../../store/guestCartStore";
import { optimizedImageUrl } from "../../utils/image";
import type { BuyerStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 700;

export function CartScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const guestItems = useGuestCartStore((s) => s.items);
  const guestUpdateItem = useGuestCartStore((s) => s.updateItem);
  const guestRemoveItem = useGuestCartStore((s) => s.removeItem);
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: 50 },
    centeredColumn: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const, paddingHorizontal: 16 },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    titleRow: { flexDirection: "row" as const, alignItems: "center", justifyContent: "space-between" as const, marginBottom: 16 },
    title: { fontSize: 26, fontWeight: "800" as const, color: colors.text },
    itemCountBadge: {
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    itemCountText: { fontSize: 12, fontWeight: "700" as const, color: colors.textMuted },
    list: { paddingBottom: 20 },
    empty: { alignItems: "center" as const, marginTop: 60, paddingHorizontal: 24, gap: 12 },
    emptyTitle: { fontSize: 18, fontWeight: "800" as const, color: colors.text },
    emptyText: { color: colors.textMuted, textAlign: "center" as const, lineHeight: 20, marginBottom: 8 },
    card: {
      flexDirection: "row" as const,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 10,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity + 0.01,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    image: { width: 80, height: 80, borderRadius: 14, backgroundColor: colors.placeholderBg },
    rowBody: { flex: 1, marginLeft: 14, justifyContent: "center" as const },
    itemTitle: { fontSize: 15, fontWeight: "700" as const, color: colors.text },
    itemPrice: { fontSize: 15, fontWeight: "800" as const, marginTop: 4 },
    actionsRow: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, marginTop: 12 },
    stepper: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      padding: 3,
    },
    stepperButton: { width: 32, height: 32, alignItems: "center" as const, justifyContent: "center" as const, borderRadius: 8, backgroundColor: colors.surface },
    stepperValue: { fontSize: 14, fontWeight: "800" as const, color: colors.text, minWidth: 26, textAlign: "center" as const },
    deleteButton: { padding: 6, borderRadius: 8 },
    footer: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
      paddingTop: 16,
      paddingBottom: 24,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity + 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: -3 },
      elevation: 4,
    },
    summaryCard: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      padding: 12,
      marginBottom: 14,
      gap: 6,
    },
    summaryRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
    summaryLabel: { fontSize: 13, color: colors.textMuted },
    summaryValue: { fontSize: 13, fontWeight: "600" as const, color: colors.text },
    totalRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "baseline" as const, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 },
    totalLabel: { fontSize: 15, fontWeight: "700" as const, color: colors.text },
    totalValue: { fontSize: 22, fontWeight: "900" as const, color: colors.text },
  }));

  const cartQuery = useQuery({ queryKey: ["cart"], queryFn: CartApi.get, enabled: !!user });

  const updateItem = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      CartApi.updateItem(itemId, { quantity }),
    onSuccess: (data) => queryClient.setQueryData(["cart"], data),
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) => CartApi.removeItem(itemId),
    onSuccess: (data) => queryClient.setQueryData(["cart"], data),
  });

  const handleUpdate = (item: CartItemDto, quantity: number) => {
    if (user) {
      updateItem.mutate({ itemId: item.id, quantity });
    } else {
      guestUpdateItem(item.productId, quantity);
    }
  };

  const handleRemove = (item: CartItemDto) => {
    if (user) {
      removeItem.mutate(item.id);
    } else {
      guestRemoveItem(item.productId);
    }
  };

  const items = user ? (cartQuery.data?.items ?? []) : guestItems;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + Number(item.priceAtAdd) * item.quantity, 0);

  if (user && cartQuery.isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centeredColumn}>
          <Text style={styles.title}>Your cart</Text>
          <View style={{ marginTop: 16 }}>
            <CartItemSkeleton />
            <CartItemSkeleton />
            <CartItemSkeleton />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.centeredColumn}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Your cart</Text>
          {items.length > 0 && (
            <View style={styles.itemCountBadge}>
              <Text style={styles.itemCountText}>
                {totalQuantity} {totalQuantity === 1 ? "item" : "items"}
              </Text>
            </View>
          )}
        </View>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item: CartItemDto) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={48} color={theme.colors.textFaint} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyText}>
              Looks like you haven't added anything to your cart yet. Explore fresh produce and items now!
            </Text>
            <PrimaryButton
              title="Start shopping"
              onPress={() => navigation.navigate("BuyerTabs")}
              size="md"
              leftIcon="basket-outline"
            />
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.centeredColumn}>
            <View style={styles.card}>
              <Image source={{ uri: optimizedImageUrl(item.product.images[0], 160) }} style={styles.image} />
              <View style={styles.rowBody}>
                <Text numberOfLines={1} style={styles.itemTitle}>
                  {item.product.title}
                </Text>
                <Text style={[styles.itemPrice, { color: theme.primaryColor }]}>
                  {item.product.currency} {Number(item.priceAtAdd).toLocaleString()}
                </Text>
                <View style={styles.actionsRow}>
                  <View style={styles.stepper}>
                    <Pressable
                      style={styles.stepperButton}
                      onPress={() => handleUpdate(item, Math.max(1, item.quantity - 1))}
                      accessibilityRole="button"
                      accessibilityLabel="Decrease quantity"
                      hitSlop={8}
                    >
                      <Ionicons name="remove" size={16} color={theme.colors.text} />
                    </Pressable>
                    <Text style={styles.stepperValue}>{item.quantity}</Text>
                    <Pressable
                      style={styles.stepperButton}
                      onPress={() => handleUpdate(item, item.quantity + 1)}
                      accessibilityRole="button"
                      accessibilityLabel="Increase quantity"
                      hitSlop={8}
                    >
                      <Ionicons name="add" size={16} color={theme.colors.text} />
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() => handleRemove(item)}
                    hitSlop={8}
                    style={styles.deleteButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.product.title} from cart`}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}
      />

      {items.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.centeredColumn}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal ({totalQuantity} items)</Text>
                <Text style={styles.summaryValue}>
                  {items[0].product.currency} {total.toLocaleString()}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery</Text>
                <Text style={styles.summaryValue}>Calculated at checkout</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  {items[0].product.currency} {total.toLocaleString()}
                </Text>
              </View>
            </View>
            <PrimaryButton
              title="Proceed to checkout"
              size="lg"
              leftIcon="lock-closed-outline"
              onPress={() =>
                user
                  ? navigation.navigate("Checkout")
                  : navigation.navigate("GuestCheckout", { redirectTo: "Checkout" })
              }
            />
          </View>
        </View>
      )}
    </View>
  );
}
