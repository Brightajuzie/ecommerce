import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import { AuthApi } from "../../api/endpoints";
import { getErrorMessage } from "../../api/errorMessage";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { BuyerStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 440;

// Reached from OrderDetailScreen's "Set a password" card — claims a
// guest-checkout account (see AuthService.guestCheckout) so it can be
// logged into next time, instead of only ever being reachable via whatever
// device/browser placed the order.
export function SetPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const updateUser = useAuthStore((s) => s.updateUser);
  const theme = useTheme();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 24, paddingTop: 60 },
    centeredColumn: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const },
    headerRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, marginBottom: 16 },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    title: { fontSize: 22, fontWeight: "800" as const, color: colors.text },
    hint: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 24 },
    errorText: { color: colors.danger, fontSize: 13, marginBottom: 16 },
  }));

  const setPasswordMutation = useMutation({
    mutationFn: () => AuthApi.setPassword({ password }),
    onSuccess: async () => {
      await updateUser({ hasPassword: true });
      Alert.alert("Password set", "You can now sign in with this password next time.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    },
  });

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.centeredColumn}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.title}>Set a password</Text>
        </View>
        <Text style={styles.hint}>
          Save your details so you can sign in and check your order history next time, instead of
          checking out as a guest again.
        </Text>

        <FormInput label="New password" value={password} onChangeText={setPassword} secureTextEntry />
        <FormInput
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        {mismatch && <Text style={styles.errorText}>Passwords don't match.</Text>}
        {setPasswordMutation.isError && (
          <Text style={styles.errorText}>
            {getErrorMessage(setPasswordMutation.error, "Couldn't set your password. Please try again.")}
          </Text>
        )}

        <PrimaryButton
          title="Save password"
          onPress={() => setPasswordMutation.mutate()}
          loading={setPasswordMutation.isPending}
          disabled={password.length < 8 || mismatch}
        />
      </View>
    </ScrollView>
  );
}
