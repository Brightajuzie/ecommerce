import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";

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
  const variantColors: Record<NonNullable<PrimaryButtonProps["variant"]>, string> = {
    primary: theme.primaryColor,
    secondary: theme.secondaryColor,
    danger: "#DC2626",
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

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  text: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
