import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

// EAS free-tier build artifacts expire ~30 days after the build (this one on
// 2026-08-23) — replace with a permanent host (own storage, Play Store listing)
// before that, or re-build and swap this URL.
const ANDROID_APK_URL =
  "https://expo.dev/artifacts/eas/4GhNeDD1MjSMKzfqFbVOstj57OeXKIOCXL3J35sqQic.apk";

// No iOS build exists yet — real-device installs need an Apple Developer
// Program membership for ad-hoc/TestFlight distribution, which this project
// doesn't have configured. Flip this once an IPA/TestFlight link exists.
const IOS_APP_URL: string | null = null;

export function AppDownloadBanner() {
  const theme = useTheme();

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
          <Ionicons name="logo-apple" size={20} color="#111827" />
          <View>
            <Text style={[styles.buttonCaption, styles.buttonCaptionMuted]}>Download for</Text>
            <Text style={[styles.buttonLabel, styles.buttonLabelMuted]}>iOS</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  textBlock: { flexShrink: 1, minWidth: 180 },
  title: { fontSize: 15, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  buttonRow: { flexDirection: "row", gap: 10 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  buttonMuted: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB" },
  buttonCaption: { fontSize: 9, color: "rgba(255,255,255,0.85)", fontWeight: "600" },
  buttonCaptionMuted: { color: "#6B7280" },
  buttonLabel: { fontSize: 13, color: "#fff", fontWeight: "800" },
  buttonLabelMuted: { color: "#111827" },
});
