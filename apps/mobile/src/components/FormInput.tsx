import type { ReactNode } from "react";
import { useState } from "react";
import { Text, TextInput, type TextInputProps, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  rightElement?: ReactNode;
}

export function FormInput({
  label,
  error,
  hint,
  rightElement,
  style,
  onFocus,
  onBlur,
  ...rest
}: FormInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const styles = useThemedStyles((colors) => ({
    container: { marginBottom: 16 },
    labelRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      marginBottom: 6,
    },
    label: { fontSize: 13, fontWeight: "700" as const, color: colors.textSecondary },
    inputContainer: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      borderRadius: 12,
      backgroundColor: colors.surface,
      minHeight: 48,
      paddingHorizontal: 12,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
    },
    inputContainerFocused: {
      borderColor: theme.primaryColor,
      shadowColor: theme.primaryColor,
      shadowOpacity: theme.scheme === "dark" ? 0.35 : 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
      elevation: 2,
    },
    inputContainerError: { borderColor: colors.danger },
    input: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      outlineWidth: 0,
    },
    rightSlot: {
      marginLeft: 8,
      justifyContent: "center" as const,
      alignItems: "center" as const,
    },
    hint: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
    error: { color: colors.danger, fontSize: 12, marginTop: 4, fontWeight: "600" as const },
  }));

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View
        style={[
          styles.inputContainer,
          focused && !error && styles.inputContainerFocused,
          error ? styles.inputContainerError : null,
        ]}
      >
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={theme.colors.textFaint}
          autoCapitalize="none"
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={label}
          {...rest}
        />
        {rightElement ? <View style={styles.rightSlot}>{rightElement}</View> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}
