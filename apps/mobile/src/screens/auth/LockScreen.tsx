import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAuthStore } from "../../store/authStore";

export function LockScreen() {
  const unlock = useAuthStore((s) => s.unlock);
  const logout = useAuthStore((s) => s.logout);
  const [checking, setChecking] = useState(false);
  const [lastFailed, setLastFailed] = useState(false);

  const promptBiometrics = useCallback(async () => {
    setChecking(true);
    setLastFailed(false);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Ikaystores",
        disableDeviceFallback: false,
      });
      if (result.success) {
        unlock();
      } else {
        setLastFailed(true);
      }
    } finally {
      setChecking(false);
    }
  }, [unlock]);

  useEffect(() => {
    promptBiometrics();
  }, [promptBiometrics]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ikaystores is locked</Text>
      <Text style={styles.subtitle}>
        {lastFailed
          ? "Authentication failed. Try again, or log out to sign in with your password."
          : "Use Face ID, Touch ID, or your device passcode to continue."}
      </Text>

      <PrimaryButton title="Try again" onPress={promptBiometrics} loading={checking} />
      <View style={styles.spacer} />
      <PrimaryButton title="Log out instead" variant="secondary" onPress={() => logout()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", justifyContent: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 12, textAlign: "center" },
  subtitle: { fontSize: 15, color: "#6B7280", textAlign: "center", marginBottom: 24, lineHeight: 22 },
  spacer: { height: 12 },
});
