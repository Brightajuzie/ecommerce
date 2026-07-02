import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { UsersApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAuthStore } from "../../store/authStore";

export function ProfileScreen() {
  const logout = useAuthStore((s) => s.logout);
  const meQuery = useQuery({ queryKey: ["me"], queryFn: UsersApi.me });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {meQuery.data && (
        <View style={styles.card}>
          <Text style={styles.name}>
            {meQuery.data.firstName} {meQuery.data.lastName}
          </Text>
          <Text style={styles.email}>{meQuery.data.email}</Text>
          <Text style={styles.role}>{meQuery.data.role}</Text>
        </View>
      )}
      <PrimaryButton title="Log out" variant="danger" onPress={() => logout()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 16 },
  card: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 16, marginBottom: 24 },
  name: { fontSize: 18, fontWeight: "700", color: "#111827" },
  email: { color: "#6B7280", marginTop: 4 },
  role: { color: "#6B7280", marginTop: 4, fontSize: 12, textTransform: "uppercase" },
});
