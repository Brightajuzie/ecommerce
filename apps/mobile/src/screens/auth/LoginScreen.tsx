import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { AuthApi } from "../../api/endpoints";
import { useAuthStore } from "../../store/authStore";
import type { AuthStackParamList } from "../../navigation/types";

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing details", "Enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const result = await AuthApi.login({ email: email.trim(), password });
      await setSession(result.accessToken, result.refreshToken, result.user);
    } catch (error: any) {
      Alert.alert(
        "Login failed",
        error?.response?.data?.message ?? "Please check your credentials and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.title}>IkStore</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <FormInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <FormInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />

        <PrimaryButton title="Log in" onPress={handleLogin} loading={loading} />

        <Text style={styles.link} onPress={() => navigation.navigate("Register")}>
          Don't have an account? Sign up
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 32, fontWeight: "800", color: "#111827", marginBottom: 4 },
  subtitle: { fontSize: 16, color: "#6B7280", marginBottom: 32 },
  link: { marginTop: 20, textAlign: "center", color: "#111827", fontWeight: "600" },
});
