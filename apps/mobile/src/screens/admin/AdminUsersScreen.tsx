import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { UserRole } from "@ikaystores/shared";
import type { AdminUserDto } from "@ikaystores/shared";
import { AdminUsersApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import type { AdminStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 800;

// Scoped to BUYER/VENDOR accounts — see users.service.ts on the backend for
// why ADMIN/SUPER_ADMIN accounts never appear here or go through this flow.
export function AdminUsersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const theme = useTheme();
  const [search, setSearch] = useState("");

  const usersQuery = useQuery({
    queryKey: ["adminUsers", search],
    queryFn: () => AdminUsersApi.list({ search: search || undefined, pageSize: 50 }),
  });

  return (
    <View style={styles.container}>
      <View style={styles.centeredColumn}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Users</Text>
          <PrimaryButton title="+ Add user" onPress={() => navigation.navigate("UserForm", undefined)} />
        </View>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="#9CA3AF" />
          <TextInput
            style={styles.search}
            placeholder="Search by name or email..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {usersQuery.isLoading ? (
        <ActivityIndicator style={styles.loading} color={theme.primaryColor} />
      ) : (
        <FlatList
          data={usersQuery.data?.data ?? []}
          keyExtractor={(item: AdminUserDto) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centeredColumn}>
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={32} color="#9CA3AF" />
                <Text style={styles.emptyText}>No users found.</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.centeredColumn}>
              <Pressable
                style={styles.row}
                onPress={() => navigation.navigate("UserForm", { userId: item.id })}
              >
                <View style={styles.rowBody}>
                  <Text style={styles.rowName}>
                    {item.firstName} {item.lastName}
                  </Text>
                  <Text style={styles.rowEmail}>{item.email}</Text>
                  {item.role === UserRole.VENDOR && item.vendorProfile && (
                    <Text style={styles.rowVendor}>{item.vendorProfile.businessName}</Text>
                  )}
                </View>
                <View style={styles.badgeColumn}>
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: item.role === UserRole.VENDOR ? theme.primaryColor : "#6B7280" },
                    ]}
                  >
                    <Text style={styles.badgeText}>{item.role}</Text>
                  </View>
                  {!item.isActive && (
                    <View style={[styles.roleBadge, styles.suspendedBadge]}>
                      <Text style={styles.badgeText}>Suspended</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", paddingTop: 60 },
  centeredColumn: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 },
  title: { fontSize: 26, fontWeight: "800", color: "#111827" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  search: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  loading: { marginTop: 40 },
  list: { paddingBottom: 24 },
  empty: { alignItems: "center", marginTop: 40, gap: 8 },
  emptyText: { color: "#6B7280" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  rowBody: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  rowEmail: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  rowVendor: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  badgeColumn: { gap: 6, alignItems: "flex-end" },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  suspendedBadge: { backgroundColor: "#DC2626" },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
