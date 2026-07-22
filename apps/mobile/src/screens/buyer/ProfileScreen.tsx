import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import * as LocalAuthentication from "expo-local-authentication";
import { UserRole } from "@ikaystores/shared";
import { UsersApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAuthStore } from "../../store/authStore";
import type { BuyerStackParamList } from "../../navigation/types";

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);
  const setBiometricEnabled = useAuthStore((s) => s.setBiometricEnabled);
  const viewAsBuyer = useAuthStore((s) => s.viewAsBuyer);
  const setViewAsBuyer = useAuthStore((s) => s.setViewAsBuyer);
  const meQuery = useQuery({ queryKey: ["me"], queryFn: UsersApi.me, enabled: !!user });

  const handleToggleBiometrics = async (nextValue: boolean) => {
    if (!nextValue) {
      await setBiometricEnabled(false);
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) {
      Alert.alert(
        "Not available",
        "Biometric authentication isn't set up on this device. Add a fingerprint or Face ID in your device settings first.",
      );
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Confirm to enable biometric login",
    });
    if (result.success) {
      await setBiometricEnabled(true);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.guestPrompt}>Sign in to manage your account and view your orders.</Text>
        <PrimaryButton title="Sign in" onPress={() => navigation.navigate("Login")} />
        <View style={styles.spacer} />
        <PrimaryButton
          title="Create an account"
          variant="secondary"
          onPress={() => navigation.navigate("Register")}
        />
      </View>
    );
  }

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

      {user.role !== UserRole.BUYER && (
        <>
          <PrimaryButton
            title={viewAsBuyer ? "Back to dashboard" : "View store"}
            variant="secondary"
            onPress={() => setViewAsBuyer(!viewAsBuyer)}
          />
          <View style={styles.spacer} />
        </>
      )}

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Enable biometric login</Text>
        <Switch value={biometricEnabled} onValueChange={handleToggleBiometrics} />
      </View>

      <PrimaryButton title="Log out" variant="danger" onPress={() => logout()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 16 },
  guestPrompt: { color: "#6B7280", marginBottom: 20, fontSize: 15, lineHeight: 22 },
  spacer: { height: 12 },
  card: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 16, marginBottom: 24 },
  name: { fontSize: 18, fontWeight: "700", color: "#111827" },
  email: { color: "#6B7280", marginTop: 4 },
  role: { color: "#6B7280", marginTop: 4, fontSize: 12, textTransform: "uppercase" },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  toggleLabel: { fontSize: 15, color: "#111827", fontWeight: "600", flex: 1 },
});
