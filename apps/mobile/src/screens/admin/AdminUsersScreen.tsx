import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { UserRole } from "@ikaystores/shared";
import type { AdminUserDto } from "@ikaystores/shared";
import { AdminUsersApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { AdminStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 800;

// Scoped to BUYER/VENDOR accounts — see users.service.ts on the backend for
// why ADMIN/SUPER_ADMIN accounts never appear here or go through this flow.
export function AdminUsersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
    centeredColumn: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const, paddingHorizontal: 16 },
    headerRow: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, marginBottom: 16, gap: 12 },
    title: { fontSize: 26, fontWeight: "800" as const, color: colors.text },
    searchWrap: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 12,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    search: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },
    loading: { marginTop: 40 },
    list: { paddingBottom: 24 },
    empty: { alignItems: "center" as const, marginTop: 40, gap: 8 },
    emptyText: { color: colors.textMuted },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    rowBody: { flex: 1 },
    rowName: { fontSize: 15, fontWeight: "700" as const, color: colors.text },
    rowEmail: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    rowVendor: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
    badgeColumn: { gap: 6, alignItems: "flex-end" as const },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    suspendedBadge: { backgroundColor: colors.danger },
    badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" as const },
  }));

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
          <Ionicons name="search" size={16} color={theme.colors.textFaint} />
          <TextInput
            style={styles.search}
            placeholder="Search by name or email..."
            placeholderTextColor={theme.colors.textFaint}
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
                <Ionicons name="people-outline" size={32} color={theme.colors.textFaint} />
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
                      { backgroundColor: item.role === UserRole.VENDOR ? theme.primaryColor : theme.colors.textMuted },
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
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textFaint} />
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}
