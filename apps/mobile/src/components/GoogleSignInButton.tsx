import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import { UserRole } from "@ikaystores/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthApi, CartApi, SettingsApi } from "../api/endpoints";
import { getErrorMessage } from "../api/errorMessage";
import { useAuthStore } from "../store/authStore";
import { syncGuestCartToServer } from "../store/guestCartStore";
import { useTheme } from "../theme/ThemeContext";

interface Props {
  /** Called with an error string when Google sign-in fails. */
  onError: (message: string) => void;
  /** Called after a successful sign-in — use to navigate away. */
  onSuccess: (role: UserRole) => void;
  /** Optional extra params that should be sent on the CartApi side-effect. */
  pendingCartItem?: Parameters<typeof CartApi.addItem>[0];
}

/**
 * Self-contained "Continue with Google" button.
 *
 * Uses expo-auth-session's Google ID-token flow so the backend can verify
 * the token directly (POST /auth/google) without any extra OAuth handshake.
 * Works in Expo Go for development; requires a native build for production.
 */
export function GoogleSignInButton({ onError, onSuccess, pendingCartItem }: Props) {
  const theme = useTheme();
  const setSession = useAuthStore((s) => s.setSession);
  const setViewAsBuyer = useAuthStore((s) => s.setViewAsBuyer);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

  // Check dynamically configured Google Client IDs from the database via GET /settings,
  // falling back to statically bundled constants in app.json.
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: SettingsApi.get,
    staleTime: 5 * 60 * 1000,
  });

  const androidClientId =
    settingsQuery.data?.googleAndroidClientId || extra.googleAndroidClientId;
  const iosClientId =
    settingsQuery.data?.googleIosClientId || extra.googleIosClientId;
  const webClientId =
    settingsQuery.data?.googleClientId || extra.googleWebClientId;

  const [, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId,
    iosClientId,
    // Web client ID is optional — used for token audience and web/Expo Go testing
    webClientId,
    selectAccount: true,
  });

  // React to the OAuth response when the auth session returns.
  useEffect(() => {
    if (response?.type !== "success") return;

    const idToken = response.params.id_token;
    if (!idToken) {
      onError("Google sign-in did not return an ID token. Please try again.");
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const result = await AuthApi.googleAuth({ idToken });
        await setSession(result.accessToken, result.refreshToken, result.user);
        await syncGuestCartToServer();
        if (pendingCartItem) {
          await CartApi.addItem(pendingCartItem).catch(() => {});
        }
        queryClient.invalidateQueries({ queryKey: ["cart"] });

        const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDITOR].includes(
          result.user.role,
        );
        if (isAdmin) setViewAsBuyer(true);

        onSuccess(result.user.role);
      } catch (err) {
        onError(getErrorMessage(err, "Google sign-in failed. Please try again."));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const handlePress = async () => {
    if (!promptAsync) {
      onError("Google sign-in is not configured. Please contact support.");
      return;
    }
    onError(""); // Clear any previous error
    setLoading(true);
    try {
      await promptAsync();
    } catch (err) {
      onError(getErrorMessage(err, "Could not open Google sign-in. Please try again."));
      setLoading(false);
    }
    // loading will be reset in the useEffect once the response arrives
  };

  // If no client IDs are configured at all (server + app.json), hide the
  // button entirely — rendering it would crash on web (hook requires at
  // least one ID) and is meaningless on native too.
  if (!androidClientId && !iosClientId && !webClientId) {
    return null;
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          opacity: pressed || loading ? 0.7 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.textMuted} />
      ) : (
        <>
          {/* Google "G" logo — inline SVG-equivalent using coloured squares as RN rectangles */}
          <GoogleLogo />
          <Text
            style={[styles.label, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            Continue with Google
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Simple Google "G" mark built from coloured View blocks. */
function GoogleLogo() {
  return (
    <View style={logoStyles.container} accessibilityElementsHidden>
      <View style={[logoStyles.bar, logoStyles.blue]} />
      <View style={[logoStyles.bar, logoStyles.red]} />
      <View style={[logoStyles.bar, logoStyles.yellow]} />
      <View style={[logoStyles.bar, logoStyles.green]} />
    </View>
  );
}

const logoStyles = StyleSheet.create({
  container: { width: 18, height: 18, flexDirection: "row", flexWrap: "wrap", gap: 1 },
  bar: { width: 8, height: 8, borderRadius: 1 },
  blue: { backgroundColor: "#4285F4" },
  red: { backgroundColor: "#EA4335" },
  yellow: { backgroundColor: "#FBBC05" },
  green: { backgroundColor: "#34A853" },
});

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
});
