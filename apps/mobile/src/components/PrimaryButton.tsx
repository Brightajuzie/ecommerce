import { ActivityIndicator, Pressable, Text, useWindowDimensions } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

// Same breakpoint ResponsiveTabBar switches on — below it we're on a phone
// where a full-bleed button is the right touch target; at/above it we're on
// a wide web/tablet viewport where a button stretched across an 800-900px
// content column just looks oversized, so it shrinks to its content (capped
// by minWidth/maxWidth) and centers instead.
const LARGE_SCREEN_BREAKPOINT = 768;

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
}: PrimaryButtonProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= LARGE_SCREEN_BREAKPOINT;
  const styles = useThemedStyles((colors) => ({
    button: {
      borderRadius: 10,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      flexShrink: 1,
      ...(isLargeScreen && { alignSelf: "center" as const, minWidth: 200, maxWidth: 360 }),
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity + 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    disabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
    pressed: { opacity: 0.85, shadowOpacity: 0, elevation: 0 },
    text: { color: "#fff", fontSize: 16, fontWeight: "600" as const, flexShrink: 1 },
  }));
  const variantColors: Record<NonNullable<PrimaryButtonProps["variant"]>, string> = {
    primary: theme.primaryColor,
    secondary: theme.secondaryColor,
    danger: theme.colors.danger,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: variantColors[variant] },
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
      )}
    </Pressable>
  );
}
