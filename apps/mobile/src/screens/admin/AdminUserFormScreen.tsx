import { useEffect, useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRole } from "@ikaystores/shared";
import { AdminUsersApi } from "../../api/endpoints";
import { getErrorMessage } from "../../api/errorMessage";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { AdminStackParamList } from "../../navigation/types";

// Create/edit for BUYER/VENDOR accounts only — the backend rejects any
// attempt to touch an ADMIN/SUPER_ADMIN account or set that role here.
export function AdminUserFormScreen() {
  const route = useRoute<RouteProp<AdminStackParamList, "UserForm">>();
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const queryClient = useQueryClient();
  const userId = route.params?.userId;

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
  const [asVendor, setAsVendor] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const styles = useThemedStyles((colors, t) => ({
    container: { flex: 1, backgroundColor: colors.surface },
    content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
    title: { fontSize: 24, fontWeight: "800" as const, color: colors.text, marginBottom: 16 },
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
  }));

  useEffect(() => {
    if (userQuery.data) {
      const u = userQuery.data;
      setFirstName(u.firstName);
      setLastName(u.lastName);
      setEmail(u.email);
      setPhone(u.phone ?? "");
      setAsVendor(u.role === UserRole.VENDOR);
      setBusinessName(u.vendorProfile?.businessName ?? "");
      setIsActive(u.isActive);
    }
  }, [userQuery.data]);

  // Once an account is already a vendor, this form can no longer switch it
  // back to buyer (see users.service.ts) — so the toggle is locked on.
  const vendorToggleLocked = !!userId && userQuery.data?.role === UserRole.VENDOR;

  const saveMutation = useMutation({
    mutationFn: () => {
      if (userId) {
        return AdminUsersApi.update(userId, {
          firstName,
          lastName,
          email,
          phone: phone || undefined,
          role: asVendor ? UserRole.VENDOR : UserRole.BUYER,
          businessName: asVendor ? businessName : undefined,
          isActive,
        });
      }
      return AdminUsersApi.create({
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        password,
        role: asVendor ? UserRole.VENDOR : UserRole.BUYER,
        businessName: asVendor ? businessName : undefined,
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
    (!asVendor || !!businessName);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{userId ? "Edit user" : "Add user"}</Text>

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

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Vendor account</Text>
        <Switch value={asVendor} onValueChange={setAsVendor} disabled={vendorToggleLocked} />
      </View>
      {asVendor && (
        <FormInput
          label="Business name"
          value={businessName}
          onChangeText={setBusinessName}
          editable={!vendorToggleLocked || !businessName}
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
