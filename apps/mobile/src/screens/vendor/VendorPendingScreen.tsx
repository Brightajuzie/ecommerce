import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAuthStore } from "../../store/authStore";

export function VendorPendingScreen() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Application under review</Text>
      <Text style={styles.body}>
        Your vendor account is pending approval. You'll be able to list products and manage
        orders once an admin approves your application.
      </Text>
      <PrimaryButton title="Log out" variant="secondary" onPress={() => logout()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", justifyContent: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 12, textAlign: "center" },
  body: { fontSize: 15, color: "#6B7280", textAlign: "center", marginBottom: 24, lineHeight: 22 },
});
