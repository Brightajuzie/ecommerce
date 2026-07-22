import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import type { OrderDto } from "@ikaystores/shared";
import { OrdersApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAuthStore } from "../../store/authStore";
import type { BuyerStackParamList } from "../../navigation/types";

export function OrderHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: OrdersApi.myOrders,
    enabled: !!user,
  });

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Your orders</Text>
        <Text style={styles.empty}>Sign in to view your orders.</Text>
        <PrimaryButton title="Sign in" onPress={() => navigation.navigate("Login")} />
      </View>
    );
  }

  if (ordersQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your orders</Text>
      <FlatList
        data={ordersQuery.data ?? []}
        keyExtractor={(item: OrderDto) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No orders yet.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate("OrderDetail", { orderId: item.id })}
          >
            <View>
              <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
              <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.orderTotal}>
                {item.currency} {Number(item.totalAmount).toLocaleString()}
              </Text>
              <Text style={styles.orderStatus}>{item.status}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 16 },
  empty: { textAlign: "center", marginTop: 40, color: "#6B7280" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  orderId: { fontWeight: "700", color: "#111827" },
  orderDate: { color: "#6B7280", marginTop: 2, fontSize: 13 },
  rowRight: { alignItems: "flex-end" },
  orderTotal: { fontWeight: "700", color: "#111827" },
  orderStatus: { color: "#6B7280", marginTop: 2, fontSize: 13 },
});
