import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import type { ProductDto } from "@ikaystores/shared";
import { ProductsApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import type { VendorStackParamList } from "../../navigation/types";

export function MyProductsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<VendorStackParamList>>();
  const productsQuery = useQuery({ queryKey: ["myProducts"], queryFn: ProductsApi.listMine });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My products</Text>
        <PrimaryButton title="+ New" onPress={() => navigation.navigate("ProductForm", undefined)} />
      </View>

      {productsQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={productsQuery.data ?? []}
          keyExtractor={(item: ProductDto) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>You haven't listed any products yet.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => navigation.navigate("ProductForm", { productId: item.id })}
            >
              <View>
                <Text style={styles.productTitle}>{item.title}</Text>
                <Text style={styles.productMeta}>
                  {item.currency} {Number(item.price).toLocaleString()} · {item.stock} in stock
                </Text>
              </View>
              <Text style={styles.productStatus}>{item.status}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "800", color: "#111827" },
  empty: { textAlign: "center", marginTop: 40, color: "#6B7280" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  productTitle: { fontWeight: "700", color: "#111827" },
  productMeta: { color: "#6B7280", marginTop: 2, fontSize: 13 },
  productStatus: { color: "#6B7280", fontSize: 12 },
});
