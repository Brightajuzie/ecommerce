import { View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

// A thin, indeterminate-looking-but-actually-real progress track — driven
// by axios's onUploadProgress (see api/upload.ts's pickAndUploadImage),
// not a fake/animated placeholder. Rendered under the "Uploading…" label
// on every upload screen (ProductFormScreen, VendorPendingScreen,
// SlideFormScreen, StoreSettingsScreen) so a slow connection shows visible
// movement instead of an indefinite spinner that looks identical whether
// it's about to finish or stuck.
export function UploadProgressBar({ percent }: { percent: number }) {
  const theme = useTheme();
  const styles = useThemedStyles((colors) => ({
    track: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.surfaceAlt,
      overflow: "hidden" as const,
      width: "100%" as const,
    },
  }));
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <View style={styles.track}>
      <View
        style={{
          height: "100%",
          width: `${clamped}%`,
          backgroundColor: theme.primaryColor,
          borderRadius: 2,
        }}
      />
    </View>
  );
}
