import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

type StatusBannerProps = {
  type: "error" | "success";
  message: string;
};

// Shared error/success banner — replaces the near-identical inline
// errorBanner block that used to be hand-copied (with slightly different
// hardcoded hex values) into ProductFormScreen, VendorPendingScreen,
// SlideFormScreen, and StoreSettingsScreen. Pulls from the theme's
// success/dangerSubtle tokens (theme/colors.ts) instead of hardcoding
// per-scheme hex, so it repaints correctly if those tokens ever change.
//
// Rendered inline rather than via Alert.alert for errors — Alert.alert can
// be silently suppressed on some mobile web browsers, which would
// otherwise leave a failed upload with no visible feedback at all (see
// api/upload.ts and the 4 screens that use this for upload errors).
export function StatusBanner({ type, message }: StatusBannerProps) {
  const theme = useTheme();
  const isError = type === "error";
  // NOT built via useThemedStyles: that hook memoizes purely on `theme`
  // (see its own comment), so a factory closing over this component's own
  // `type` prop would go stale if one mounted StatusBanner instance ever
  // had its `type` change without `theme` also changing. These two small
  // style objects are cheap enough that plain per-render objects (still
  // theme-reactive, just not memoized) are simpler and safer than fighting
  // that hook's dependency contract.
  const colors = theme.colors;
  const bannerStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: isError ? colors.dangerSubtle : colors.successSubtle,
    borderWidth: 1,
    borderColor: isError ? colors.danger : colors.success,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  };
  const textStyle = {
    flex: 1,
    color: isError ? colors.danger : colors.success,
    fontSize: 13,
    fontWeight: "600" as const,
  };

  return (
    <View style={bannerStyle}>
      <Ionicons name={isError ? "alert-circle" : "checkmark-circle"} size={18} color={textStyle.color} />
      <Text style={textStyle}>{message}</Text>
    </View>
  );
}
