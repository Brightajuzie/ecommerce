import { useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { AuthApi, CartApi } from "../../api/endpoints";
import { getErrorMessage } from "../../api/errorMessage";
import { useAuthStore } from "../../store/authStore";
import { syncGuestCartToServer } from "../../store/guestCartStore";
import type { BuyerStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 440;

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const route = useRoute<RouteProp<BuyerStackParamList, "Login">>();
  const queryClient = useQueryClient();
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
      await syncGuestCartToServer();
      if (route.params?.pendingCartItem) {
        // Best-effort: the item they tried to add before being sent here to
        // sign in. Don't block a successful login over it (e.g. stock ran out
        // in the meantime) — they can always re-add it from the product page.
        await CartApi.addItem(route.params.pendingCartItem).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ["cart"] });

      // Navigate first, same as RegisterScreen: don't gate it behind the
      // welcome alert, since Alert.alert on web is a browser-native dialog
      // some mobile browsers silently suppress after an awaited call.
      if (route.params?.redirectTo === "Checkout") {
        navigation.replace("Checkout");
      } else {
        navigation.replace("BuyerTabs");
      }
      Alert.alert("Welcome back!", `Signed in as ${result.user.firstName}.`);
    } catch (error) {
      Alert.alert("Login failed", getErrorMessage(error, "Please check your credentials and try again."));
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
        <View style={styles.centeredColumn}>
          <Pressable onPress={() => navigation.navigate("BuyerTabs")} hitSlop={8}>
            <Image
              source={require("../../../assets/logo-green.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </Pressable>
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

          <Text
            style={styles.link}
            onPress={() => navigation.navigate("Register", route.params)}
          >
            Don't have an account? Sign up
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  centeredColumn: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
  logo: { height: 56, width: 128, marginBottom: 12, alignSelf: "flex-start" },
  subtitle: { fontSize: 16, color: "#6B7280", marginBottom: 32 },
  link: { marginTop: 20, textAlign: "center", color: "#111827", fontWeight: "600" },
});
