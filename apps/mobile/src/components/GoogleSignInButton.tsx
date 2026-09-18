import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
// Lowercase "google" — confirmed live by actually running Metro's web
// bundler and reading its error, not just `ls`'ing node_modules. The
// package's PUBLIC subpath is a tiny re-export shim at providers/google.js
// ("export * from '../build/providers/Google'"); the capital-G file only
// exists inside build/providers/, one level deeper, which isn't what this
// import path points at. A previous fix here changed this to capital
// "Google", reasoning from `ls build/providers/` alone that the capital
// file was the real one — but Metro's Haste module map matches path case
// exactly regardless of the OS filesystem's own case sensitivity, so
// "providers/Google" never actually resolved against the real
// "providers/google.js" file: it silently 500'd Metro's web bundle outright
// (verified by fetching the dev-server bundle URL directly), which is why
// the mobile *web* app failed to load at all — not just Google sign-in —
// for every commit between that fix and this one.
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

// Required by expo-auth-session on web — without it, the popup opened by
// promptAsync() never signals back to the tab that opened it once Google
// redirects, so the auth session hangs instead of resolving. Module-scope
// (not inside a component) so it registers as early as possible, before
// any prompt could plausibly be in flight. A no-op on native.
WebBrowser.maybeCompleteAuthSession();
import Constants from "expo-constants";
import { UserRole } from "@ikaystores/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthApi, CartApi, SettingsApi } from "../api/endpoints";
import { getErrorMessage } from "../api/errorMessage";
import { useAuthStore } from "../store/authStore";
import { syncGuestCartToServer } from "../store/guestCartStore";
import { useTheme } from "../theme/ThemeContext";

function isValidClientId(id?: string | null): id is string {
  return Boolean(
    id &&
      typeof id === "string" &&
      id.trim().length > 0 &&
      !id.startsWith("REPLACE_WITH"),
  );
}

// ─── Error Boundary ─────────────────────────────────────────────────────────
// Protects the parent screen (Login/Register) from any runtime exceptions
// thrown by expo-auth-session or WebBrowser during rendering. If Google auth
// fails to load on a given platform/environment, the error is swallowed and
// null is returned, keeping the email/password login form fully accessible.

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class GoogleAuthErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (__DEV__) {
      console.warn("GoogleSignIn component error boundary caught:", error);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

// ─── GoogleAuthButtonInner ──────────────────────────────────────────────────
// Only mounted when currentPlatformClientId is verified to be a valid string,
// ensuring invariantClientId in expo-auth-session never throws on render.

interface InnerProps {
  onError: (message: string) => void;
  onSuccess: (role: UserRole) => void;
  pendingCartItem?: Parameters<typeof CartApi.addItem>[0];
  androidClientId?: string;
  iosClientId?: string;
  webClientId?: string;
  clientId: string;
}

function GoogleAuthButtonInner({
  onError,
  onSuccess,
  pendingCartItem,
  androidClientId,
  iosClientId,
  webClientId,
  clientId,
}: InnerProps) {
  const theme = useTheme();
  const setSession = useAuthStore((s) => s.setSession);
  const setViewAsBuyer = useAuthStore((s) => s.setViewAsBuyer);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const [, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId,
    androidClientId,
    iosClientId,
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

        const isAdmin = [
          UserRole.ADMIN,
          UserRole.SUPER_ADMIN,
          UserRole.EDITOR,
        ].includes(result.user.role);
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
      onError("Google sign-in is not available. Please try again later.");
      return;
    }
    onError("");
    setLoading(true);
    try {
      await promptAsync();
    } catch (err) {
      onError(
        getErrorMessage(err, "Could not open Google sign-in. Please try again."),
      );
      setLoading(false);
    }
  };

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

// ─── GoogleSignInSection ────────────────────────────────────────────────────
// Safely renders the "or" divider + Google button only when a valid Google
// OAuth Client ID exists for the current runtime platform. Wrapped in an
// ErrorBoundary to ensure Login/Register screens NEVER crash if OAuth fails.

export interface GoogleSignInSectionProps {
  onError: (msg: string) => void;
  onSuccess: (role: UserRole) => void;
  pendingCartItem?: Parameters<typeof CartApi.addItem>[0];
  dividerStyle: object;
  dividerLineStyle: object;
  dividerTextStyle: object;
}

export function GoogleSignInSection({
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

  if (isLoading) return null;

  const rawAndroid =
    settings?.googleAndroidClientId || extra.googleAndroidClientId;
  const rawIos = settings?.googleIosClientId || extra.googleIosClientId;
  const rawWeb = settings?.googleClientId || extra.googleWebClientId;

  const androidClientId = isValidClientId(rawAndroid) ? rawAndroid.trim() : undefined;
  const iosClientId = isValidClientId(rawIos) ? rawIos.trim() : undefined;
  const webClientId = isValidClientId(rawWeb) ? rawWeb.trim() : undefined;

  // Crucial: expo-auth-session's useIdTokenAuthRequest hook requires the
  // client ID for the CURRENT platform to be defined, otherwise invariantClientId
  // throws an Error on render and crashes the screen.
  const currentPlatformClientId = Platform.select({
    ios: iosClientId,
    android: androidClientId,
    default: webClientId,
  });

  // If no valid client ID is configured for this platform, do not mount the button.
  if (!currentPlatformClientId) {
    return null;
  }

  return (
    <GoogleAuthErrorBoundary>
      <View style={dividerStyle}>
        <View style={dividerLineStyle} />
        <Text style={dividerTextStyle}>or</Text>
        <View style={dividerLineStyle} />
      </View>
      <GoogleAuthButtonInner
        clientId={currentPlatformClientId}
        androidClientId={androidClientId}
        iosClientId={iosClientId}
        webClientId={webClientId}
        onError={onError}
        onSuccess={onSuccess}
        pendingCartItem={pendingCartItem}
      />
    </GoogleAuthErrorBoundary>
  );
}

// Backwards-compatible export for standalone usage
export function GoogleSignInButton(props: {
  onError: (msg: string) => void;
  onSuccess: (role: UserRole) => void;
  pendingCartItem?: Parameters<typeof CartApi.addItem>[0];
  androidClientId?: string;
  iosClientId?: string;
  webClientId?: string;
  clientId?: string;
}) {
  const effectiveClientId =
    props.clientId ||
    Platform.select({
      ios: props.iosClientId,
      android: props.androidClientId,
      default: props.webClientId,
    });

  if (!isValidClientId(effectiveClientId)) {
    return null;
  }

  return (
    <GoogleAuthErrorBoundary>
      <GoogleAuthButtonInner
        {...props}
        clientId={effectiveClientId}
      />
    </GoogleAuthErrorBoundary>
  );
}

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
