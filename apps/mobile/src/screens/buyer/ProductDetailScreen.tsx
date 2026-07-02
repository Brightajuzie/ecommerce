import { useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProductsApi, CartApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import type { BuyerStackParamList } from "../../navigation/types";

export function ProductDetailScreen() {
  const route = useRoute<RouteProp<BuyerStackParamList, "ProductDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);

  const productQuery = useQuery({
    queryKey: ["product", route.params.productId],
    queryFn: () => ProductsApi.findOne(route.params.productId),
  });

  const addToCart = useMutation({
    mutationFn: () => CartApi.addItem({ productId: route.params.productId, quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      Alert.alert("Added to cart", "Item added to your cart.", [
        { text: "Keep shopping", style: "cancel" },
        { text: "Go to cart", onPress: () => navigation.navigate("BuyerTabs") },
      ]);
    },
    onError: (error: any) => {
      Alert.alert("Could not add to cart", error?.response?.data?.message ?? "Please try again.");
    },
  });

  if (productQuery.isLoading || !productQuery.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const product = productQuery.data;

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: product.images[0] }} style={styles.image} />
      <View style={styles.body}>
        <Text style={styles.title}>{product.title}</Text>
        <Text style={styles.price}>
          {product.currency} {Number(product.price).toLocaleString()}
        </Text>
        <Text style={styles.description}>{product.description}</Text>
        <Text style={styles.stock}>{product.stock} in stock</Text>

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
          onPress={() => addToCart.mutate()}
          loading={addToCart.isPending}
          disabled={product.stock === 0}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", aspectRatio: 1, backgroundColor: "#E5E7EB" },
  body: { padding: 20 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  price: { fontSize: 20, fontWeight: "700", color: "#111827", marginTop: 8 },
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
});
