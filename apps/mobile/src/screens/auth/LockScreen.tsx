import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAuthStore } from "../../store/authStore";
import { useThemedStyles } from "../../theme/useThemedStyles";

export function LockScreen() {
  const unlock = useAuthStore((s) => s.unlock);
  const logout = useAuthStore((s) => s.logout);
  const [checking, setChecking] = useState(false);
  const [lastFailed, setLastFailed] = useState(false);
  const styles = useThemedStyles((colors) => ({
    container: { flexGrow: 1, backgroundColor: colors.surface, justifyContent: "center" as const, padding: 24 },
    title: { fontSize: 22, fontWeight: "800" as const, color: colors.text, marginBottom: 12, textAlign: "center" as const },
    subtitle: { fontSize: 15, color: colors.textMuted, textAlign: "center" as const, marginBottom: 24, lineHeight: 22 },
    spacer: { height: 12 },
  }));

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
    <ScrollView contentContainerStyle={styles.container}>
      <View>
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
    </ScrollView>
  );
}
