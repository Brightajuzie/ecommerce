import { ActivityIndicator, Pressable, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

const LARGE_SCREEN_BREAKPOINT = 768;

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  style,
}: PrimaryButtonProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= LARGE_SCREEN_BREAKPOINT;

  const isOutline = variant === "outline";

  const styles = useThemedStyles((colors) => ({
    button: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderRadius: 12,
      gap: 8,
      ...(size === "sm"
        ? { paddingVertical: 8, paddingHorizontal: 14 }
        : size === "lg"
        ? { paddingVertical: 16, paddingHorizontal: 28 }
        : { paddingVertical: 13, paddingHorizontal: 22 }),
      flexShrink: 1,
      ...(isLargeScreen && { alignSelf: "center" as const, minWidth: 180, maxWidth: 380 }),
      shadowColor: "#000",
      shadowOpacity: isOutline ? 0 : colors.shadowOpacity + 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: isOutline ? 0 : 2,
    },
    outlineButton: {
      borderWidth: 1.5,
      borderColor: theme.primaryColor,
      backgroundColor: "transparent",
    },
    disabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
    pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
    text: {
      color: isOutline ? theme.primaryColor : "#fff",
      fontSize: size === "sm" ? 13 : size === "lg" ? 17 : 15,
      fontWeight: "700" as const,
      flexShrink: 1,
    },
  }));

  const bgColors: Record<NonNullable<PrimaryButtonProps["variant"]>, string> = {
    primary: theme.primaryColor,
    secondary: theme.secondaryColor,
    danger: theme.colors.danger,
    outline: "transparent",
  };

  const iconColor = isOutline ? theme.primaryColor : "#fff";
  const iconSize = size === "sm" ? 16 : size === "lg" ? 20 : 18;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.button,
        isOutline ? styles.outlineButton : { backgroundColor: bgColors[variant] },
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? theme.primaryColor : "#fff"} size="small" />
      ) : (
        <>
          {leftIcon && <Ionicons name={leftIcon} size={iconSize} color={iconColor} />}
          <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>
          {rightIcon && <Ionicons name={rightIcon} size={iconSize} color={iconColor} />}
        </>
      )}
    </Pressable>
  );
}
