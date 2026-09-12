import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { UserRole } from "@ikaystores/shared";
import { AdminUsersApi } from "../../api/endpoints";
import { getErrorMessage } from "../../api/errorMessage";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { AdminStackParamList } from "../../navigation/types";

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.BUYER]: "User",
  [UserRole.VENDOR]: "Vendor",
  [UserRole.EDITOR]: "Editor",
  [UserRole.ADMIN]: "Admin",
  [UserRole.SUPER_ADMIN]: "Super Admin",
};

// Client-side mirror of UsersService.manageableRolesFor on the backend —
// purely for a sensible picker; the server is what actually enforces this,
// so a mismatch here just means a rejected save, not a security hole.
function assignableRolesFor(callerRole: UserRole | undefined): UserRole[] {
  if (callerRole === UserRole.SUPER_ADMIN) {
    return [UserRole.BUYER, UserRole.VENDOR, UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN];
  }
  return [UserRole.BUYER, UserRole.VENDOR, UserRole.EDITOR];
}

// Create/edit for any role the caller can manage — see
// UsersService.manageableRolesFor on the backend, which is what actually
// enforces who can see/create/edit which accounts; the role picker here
// just mirrors that so the UI doesn't offer a choice the server would
// reject anyway.
export function AdminUserFormScreen() {
  const route = useRoute<RouteProp<AdminStackParamList, "UserForm">>();
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const userId = route.params?.userId;
  const callerRole = useAuthStore((s) => s.user?.role);
  const callerId = useAuthStore((s) => s.user?.id);

  const userQuery = useQuery({
    queryKey: ["adminUser", userId],
    queryFn: () => AdminUsersApi.findOne(userId as string),
    enabled: !!userId,
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.BUYER);
  const [businessName, setBusinessName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const styles = useThemedStyles((colors, t) => ({
    container: { flex: 1, backgroundColor: colors.surface },
    content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
    headerRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, marginBottom: 16 },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceAlt,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    logo: { height: 28, width: 64 },
    title: { fontSize: 24, fontWeight: "800" as const, color: colors.text, flex: 1 },
    errorBanner: {
      backgroundColor: t.scheme === "dark" ? "#3A1518" : "#FEF2F2",
      borderWidth: 1,
      borderColor: t.scheme === "dark" ? "#5B2226" : "#FECACA",
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    errorBannerText: { color: t.scheme === "dark" ? "#FCA5A5" : "#B91C1C", fontSize: 13, fontWeight: "600" as const },
    toggleRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      marginTop: 8,
      marginBottom: 16,
    },
    toggleLabel: { fontSize: 15, color: colors.text, fontWeight: "600" as const, flex: 1 },
    sectionLabel: { fontSize: 14, fontWeight: "700" as const, color: colors.text, marginBottom: 8, marginTop: 4 },
    roleRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, marginBottom: 8 },
    roleChip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 18,
      backgroundColor: colors.surfaceAlt,
    },
    roleChipDisabled: { opacity: 0.4 },
    roleChipText: { color: colors.textSecondary, fontWeight: "600" as const, fontSize: 13 },
    roleChipTextActive: { color: "#fff" },
    roleHint: { color: colors.textMuted, fontSize: 12, marginBottom: 16, lineHeight: 17 },
  }));

  useEffect(() => {
    if (userQuery.data) {
      const u = userQuery.data;
      setFirstName(u.firstName);
      setLastName(u.lastName);
      setEmail(u.email);
      setPhone(u.phone ?? "");
      setRole(u.role);
      setBusinessName(u.vendorProfile?.businessName ?? "");
      setIsActive(u.isActive);
    }
  }, [userQuery.data]);

  const isEditingSelf = !!userId && userId === callerId;
  // Once an account is already a vendor, this form can no longer switch it
  // to any other role (see users.service.ts — it would orphan their
  // products/orders); editing your own account can't change its own role
  // either, to avoid an accidental self-lockout.
  const roleLocked = (!!userId && userQuery.data?.role === UserRole.VENDOR) || isEditingSelf;
  const assignableRoles = assignableRolesFor(callerRole);
  // The target's current role stays selectable even if it's now outside
  // what this caller could newly assign (e.g. a SUPER_ADMIN-created EDITOR
  // being viewed — not applicable today since EDITOR is assignable by both,
  // but keeps this correct if that ever changes).
  const roleOptions =
    userQuery.data && !assignableRoles.includes(userQuery.data.role)
      ? [userQuery.data.role, ...assignableRoles]
      : assignableRoles;

  const saveMutation = useMutation({
    mutationFn: () => {
      if (userId) {
        return AdminUsersApi.update(userId, {
          firstName,
          lastName,
          email,
          phone: phone || undefined,
          role,
          businessName: role === UserRole.VENDOR ? businessName : undefined,
          isActive,
        });
      }
      return AdminUsersApi.create({
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        password,
        role,
        businessName: role === UserRole.VENDOR ? businessName : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminUser", userId] });
      navigation.goBack();
    },
    onError: (error: unknown) => {
      setErrorMessage(getErrorMessage(error, "Could not save this user. Please try again."));
    },
  });

  const canSave =
    !!firstName &&
    !!lastName &&
    !!email &&
    (userId || password.length >= 8) &&
    (role !== UserRole.VENDOR || !!businessName);

  if (userId && userQuery.isError) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.title}>Edit user</Text>
          <Pressable onPress={() => navigation.navigate("AdminTabs")} hitSlop={8}>
            <Image
              source={require("../../../assets/logo-green.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </Pressable>
        </View>
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            {getErrorMessage(userQuery.error, "Could not load this account.")}
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>{userId ? "Edit user" : "Add user"}</Text>
        {/* Stack-pushed screens sit outside AdminTabNavigator, so
            ResponsiveTabBar's own clickable brand logo isn't on screen
            here — this recreates "tap the logo to go home". */}
        <Pressable onPress={() => navigation.navigate("AdminTabs")} hitSlop={8}>
          <Image
            source={require("../../../assets/logo-green.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Pressable>
      </View>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}

      <FormInput label="First name" value={firstName} onChangeText={setFirstName} />
      <FormInput label="Last name" value={lastName} onChangeText={setLastName} />
      <FormInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <FormInput label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      {!userId && (
        <FormInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="At least 8 characters"
        />
      )}

      <Text style={styles.sectionLabel}>Role</Text>
      <View style={styles.roleRow}>
        {roleOptions.map((option) => (
          <Pressable
            key={option}
            style={[
              styles.roleChip,
              role === option && { backgroundColor: theme.primaryColor },
              roleLocked && role !== option && styles.roleChipDisabled,
            ]}
            onPress={() => !roleLocked && setRole(option)}
            disabled={roleLocked}
          >
            <Text style={[styles.roleChipText, role === option && styles.roleChipTextActive]}>
              {ROLE_LABELS[option]}
            </Text>
          </Pressable>
        ))}
      </View>
      {isEditingSelf ? (
        <Text style={styles.roleHint}>You can't change your own role.</Text>
      ) : roleLocked ? (
        <Text style={styles.roleHint}>
          An existing vendor's role can't be changed here — it would orphan their products and orders.
        </Text>
      ) : (
        (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) && (
          <Text style={styles.roleHint}>
            {role === UserRole.SUPER_ADMIN
              ? "Full access, including the platform wallet and revenue-split settings."
              : "Full admin access except the platform wallet and revenue-split settings."}
          </Text>
        )
      )}
      {role === UserRole.EDITOR && (
        <Text style={styles.roleHint}>
          Can manage products, categories, slides, and store settings only — no users, vendors,
          payments, or wallets.
        </Text>
      )}

      {role === UserRole.VENDOR && (
        <FormInput
          label="Business name"
          value={businessName}
          onChangeText={setBusinessName}
          editable={!roleLocked || !businessName}
        />
      )}

      {userId && (
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Account active</Text>
          <Switch value={isActive} onValueChange={setIsActive} />
        </View>
      )}

      <PrimaryButton
        title={userId ? "Save changes" : "Create user"}
        onPress={() => saveMutation.mutate()}
        loading={saveMutation.isPending}
        disabled={!canSave}
      />
    </ScrollView>
  );
}
