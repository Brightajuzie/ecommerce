import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { CartItemDto } from "@ikaystores/shared";
import { CartApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
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
    container: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
    centeredColumn: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const, paddingHorizontal: 16 },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    title: { fontSize: 28, fontWeight: "800" as const, color: colors.text, marginBottom: 16 },
    list: { paddingBottom: 20 },
    empty: { alignItems: "center" as const, marginTop: 60, gap: 8 },
    emptyText: { color: colors.textMuted },
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
    image: { width: 76, height: 76, borderRadius: 14, backgroundColor: colors.placeholderBg },
    rowBody: { flex: 1, marginLeft: 12, justifyContent: "center" as const },
    itemTitle: { fontSize: 15, fontWeight: "700" as const, color: colors.text },
    itemPrice: { fontSize: 14, fontWeight: "800" as const, marginTop: 3 },
    actionsRow: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, marginTop: 10 },
    stepper: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 2,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 8,
      padding: 3,
    },
    stepperButton: { width: 28, height: 28, alignItems: "center" as const, justifyContent: "center" as const, borderRadius: 6 },
    stepperValue: { fontSize: 14, fontWeight: "700" as const, color: colors.text, minWidth: 24, textAlign: "center" as const },
    footer: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
      paddingTop: 16,
      paddingBottom: 24,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity + 0.03,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: -3 },
      elevation: 4,
    },
    totalRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "baseline" as const, marginBottom: 12 },
    totalLabel: { fontSize: 14, color: colors.textMuted, fontWeight: "600" as const },
    totalValue: { fontSize: 20, fontWeight: "800" as const, color: colors.text },
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

  if (user && (cartQuery.isLoading || !cartQuery.data)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primaryColor} />
      </View>
    );
  }

  const items = user ? (cartQuery.data?.items ?? []) : guestItems;
  const total = items.reduce((sum, item) => sum + Number(item.priceAtAdd) * item.quantity, 0);

  return (
    <View style={styles.container}>
      <View style={styles.centeredColumn}>
        <Text style={styles.title}>Your cart</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item: CartItemDto) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={36} color={theme.colors.textFaint} />
            <Text style={styles.emptyText}>Your cart is empty.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.centeredColumn}>
            <View style={styles.card}>
              <Image source={{ uri: optimizedImageUrl(item.product.images[0], 150) }} style={styles.image} />
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
                    >
                      <Ionicons name="remove" size={16} color={theme.colors.text} />
                    </Pressable>
                    <Text style={styles.stepperValue}>{item.quantity}</Text>
                    <Pressable
                      style={styles.stepperButton}
                      onPress={() => handleUpdate(item, item.quantity + 1)}
                    >
                      <Ionicons name="add" size={16} color={theme.colors.text} />
                    </Pressable>
                  </View>
                  <Pressable onPress={() => handleRemove(item)} hitSlop={8}>
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
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {items[0].product.currency} {total.toLocaleString()}
              </Text>
            </View>
            <PrimaryButton
              title="Checkout"
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
