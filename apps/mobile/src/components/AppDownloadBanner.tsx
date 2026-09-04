import { Alert, Linking, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

// EAS free-tier "preview" build artifacts expire 14 days after the build
// (this one was built 2026-08-22, expires 2026-09-05) — replace with a
// permanent host (own storage, Play Store listing) before that, or re-build
// and swap this URL. Package reverted to com.ikaystores.app (matching the
// Play Store listing), and — critically — this is the first build with
// EXPO_PUBLIC_API_URL correctly pinned to the deployed Render API via
// eas.json instead of the local-dev .env's localhost value; verified by
// extracting the compiled bundle and confirming it contains the Render URL
// and zero occurrences of "localhost".
const ANDROID_APK_URL =
  "https://expo.dev/artifacts/eas/8D63Tt2pCzk4o2FJPwB2sC3GrhSrmfnQ4TfJEMvR2aU.apk";

// No iOS build exists yet — real-device installs need an Apple Developer
// Program membership for ad-hoc/TestFlight distribution, which this project
// doesn't have configured. Flip this once an IPA/TestFlight link exists.
const IOS_APP_URL: string | null = null;

export function AppDownloadBanner() {
  const theme = useTheme();
  const styles = useThemedStyles((colors) => ({
    wrapper: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: 12,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 16,
    },
    textBlock: { flexShrink: 1, minWidth: 180 },
    title: { fontSize: 15, fontWeight: "800" as const, color: colors.text },
    subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    buttonRow: { flexDirection: "row" as const, gap: 10 },
    button: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
    },
    buttonMuted: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    buttonCaption: { fontSize: 9, color: "rgba(255,255,255,0.85)", fontWeight: "600" as const },
    buttonCaptionMuted: { color: colors.textMuted },
    buttonLabel: { fontSize: 13, color: "#fff", fontWeight: "800" as const },
    buttonLabelMuted: { color: colors.text },
  }));

  if (Platform.OS !== "web") {
    return null;
  }

  const handleAndroidPress = () => {
    Linking.openURL(ANDROID_APK_URL).catch(() => {
      Alert.alert("Could not open link", "Please try again in a moment.");
    });
  };

  const handleIosPress = () => {
    if (IOS_APP_URL) {
      Linking.openURL(IOS_APP_URL).catch(() => {
        Alert.alert("Could not open link", "Please try again in a moment.");
      });
      return;
    }
    Alert.alert(
      "iOS app coming soon",
      "The iOS app isn't available for download yet. In the meantime you can keep shopping right here in your browser.",
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>Get the Ikaystores app</Text>
        <Text style={styles.subtitle}>Faster browsing, biometric login, and order tracking.</Text>
      </View>
      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, { backgroundColor: theme.primaryColor }]}
          onPress={handleAndroidPress}
        >
          <Ionicons name="logo-android" size={20} color="#fff" />
          <View>
            <Text style={styles.buttonCaption}>Download for</Text>
            <Text style={styles.buttonLabel}>Android</Text>
          </View>
        </Pressable>
        <Pressable style={[styles.button, styles.buttonMuted]} onPress={handleIosPress}>
          <Ionicons name="logo-apple" size={20} color={theme.colors.text} />
          <View>
            <Text style={[styles.buttonCaption, styles.buttonCaptionMuted]}>Download for</Text>
            <Text style={[styles.buttonLabel, styles.buttonLabelMuted]}>iOS</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
