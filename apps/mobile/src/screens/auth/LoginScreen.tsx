import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { UserRole } from "@ikaystores/shared";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { GoogleSignInButton } from "../../components/GoogleSignInButton";
import { AuthApi, CartApi, SettingsApi } from "../../api/endpoints";
import { getErrorMessage } from "../../api/errorMessage";
import { useAuthStore } from "../../store/authStore";
import { syncGuestCartToServer } from "../../store/guestCartStore";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { BuyerStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 440;

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const route = useRoute<RouteProp<BuyerStackParamList, "Login">>();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const setSession = useAuthStore((s) => s.setSession);
  const setViewAsBuyer = useAuthStore((s) => s.setViewAsBuyer);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const styles = useThemedStyles((colors, t) => ({
    flex: { flex: 1 },
    container: { padding: 24, backgroundColor: colors.background, flexGrow: 1, justifyContent: "center" as const },
    centeredColumn: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity + 0.02,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    logo: { height: 48, width: 116, marginBottom: 8, alignSelf: "flex-start" as const },
    title: { fontSize: 24, fontWeight: "800" as const, color: colors.text, marginBottom: 4 },
    subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 20 },
    errorBanner: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      backgroundColor: t.scheme === "dark" ? "#3A1518" : "#FEF2F2",
      borderWidth: 1,
      borderColor: t.scheme === "dark" ? "#5B2226" : "#FECACA",
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
    },
    errorBannerText: { flex: 1, color: t.scheme === "dark" ? "#FCA5A5" : "#B91C1C", fontSize: 13, fontWeight: "600" as const },
    eyeButton: { padding: 4 },
    linkRow: { marginTop: 24, flexDirection: "row" as const, justifyContent: "center" as const, alignItems: "center" as const, gap: 4 },
    linkMuted: { color: colors.textMuted, fontSize: 14 },
    linkAction: { color: theme.primaryColor, fontSize: 14, fontWeight: "700" as const },
    dividerRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      marginVertical: 20,
      gap: 10,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { fontSize: 12, color: colors.textMuted, fontWeight: "500" as const },
  }));

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!email || !password) {
      setErrorMessage("Please enter both your email and password.");
      return;
    }
    setLoading(true);
    try {
      const result = await AuthApi.login({ email: email.trim(), password });
      await setSession(result.accessToken, result.refreshToken, result.user);
      await syncGuestCartToServer();
      if (route.params?.pendingCartItem) {
        await CartApi.addItem(route.params.pendingCartItem).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ["cart"] });

      const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDITOR].includes(result.user.role);
      if (isAdmin) {
        setViewAsBuyer(true);
      }

      if (route.params?.redirectTo === "Checkout") {
        navigation.replace("Checkout");
      } else {
        navigation.replace("BuyerTabs");
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Please check your credentials and try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (role: UserRole) => {
    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDITOR].includes(role);
    if (route.params?.redirectTo === "Checkout") {
      navigation.replace("Checkout");
    } else {
      navigation.replace("BuyerTabs");
    }
    // Admin redirect is handled inside GoogleSignInButton via setViewAsBuyer
    void isAdmin;
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.centeredColumn}>
          <Pressable
            onPress={() => navigation.navigate("BuyerTabs")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back to Home"
          >
            <Image
              source={require("../../../assets/logo-green.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </Pressable>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={theme.colors.danger} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.card}>
            <FormInput
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errorMessage) setErrorMessage(null);
              }}
              keyboardType="email-address"
              placeholder="you@example.com"
            />
            <FormInput
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errorMessage) setErrorMessage(null);
              }}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              rightElement={
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={8}
                  style={styles.eyeButton}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={theme.colors.textMuted}
                  />
                </Pressable>
              }
            />

            <PrimaryButton
              title="Log in"
              onPress={handleLogin}
              loading={loading}
              size="lg"
              leftIcon="log-in-outline"
            />
          </View>

          {/* Only mount the Google button after settings have resolved — the
              hook inside GoogleSignInButton needs at least one client ID or it
              will throw on web. GoogleSignInButton returns null when no IDs are
              configured, so the divider should be hidden in that case too.     */}
          <GoogleSignInSection
            onError={setErrorMessage}
            onSuccess={handleGoogleSuccess}
            pendingCartItem={route.params?.pendingCartItem}
            dividerStyle={styles.dividerRow}
            dividerLineStyle={styles.dividerLine}
            dividerTextStyle={styles.dividerText}
          />

          <View style={styles.linkRow}>
            <Text style={styles.linkMuted}>Don't have an account?</Text>
            <Pressable
              onPress={() => navigation.navigate("Register", route.params)}
              accessibilityRole="link"
              accessibilityLabel="Sign up for an account"
            >
              <Text style={styles.linkAction}>Sign up</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── GoogleSignInSection ────────────────────────────────────────────────────
// Checks whether any Google client ID is configured (from DB or app.json)
// before mounting GoogleSignInButton. This prevents expo-auth-session's
// useIdTokenAuthRequest hook from throwing on web when all IDs are undefined,
// which would crash the entire LoginScreen and make it not display at all.

interface GoogleSignInSectionProps {
  onError: (msg: string) => void;
  onSuccess: (role: UserRole) => void;
  pendingCartItem?: Parameters<typeof CartApi.addItem>[0];
  dividerStyle: object;
  dividerLineStyle: object;
  dividerTextStyle: object;
}

function GoogleSignInSection({
  onError,
  onSuccess,
  pendingCartItem,
  dividerStyle,
  dividerLineStyle,
  dividerTextStyle,
}: GoogleSignInSectionProps) {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: SettingsApi.get,
    staleTime: 5 * 60 * 1000,
  });

  // While loading, don't mount the hook-bearing component yet.
  if (isLoading) return null;

  const hasGoogleId =
    !!(settings?.googleAndroidClientId || extra.googleAndroidClientId) ||
    !!(settings?.googleIosClientId || extra.googleIosClientId) ||
    !!(settings?.googleClientId || extra.googleWebClientId);

  // No client IDs at all — hide both divider and button.
  if (!hasGoogleId) return null;

  return (
    <>
      <View style={dividerStyle}>
        <View style={dividerLineStyle} />
        <Text style={dividerTextStyle}>or</Text>
        <View style={dividerLineStyle} />
      </View>
      <GoogleSignInButton
        onError={onError}
        onSuccess={onSuccess}
        pendingCartItem={pendingCartItem}
      />
    </>
  );
}
