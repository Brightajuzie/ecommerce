import { ActivityIndicator, Pressable, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

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
  const styles = useThemedStyles((colors) => ({
    button: {
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity + 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    disabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
    pressed: { opacity: 0.85, shadowOpacity: 0, elevation: 0 },
    text: { color: "#fff", fontSize: 16, fontWeight: "600" as const },
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
        <Text style={styles.text}>{title}</Text>
      )}
    </Pressable>
  );
}
