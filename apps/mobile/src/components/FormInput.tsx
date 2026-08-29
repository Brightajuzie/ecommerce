import { useState } from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function FormInput({ label, error, style, onFocus, onBlur, ...rest }: FormInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const styles = useThemedStyles((colors) => ({
    container: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: "600" as const, marginBottom: 6, color: colors.text },
    input: {
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    // A focused field gets the brand color border plus a soft matching
    // glow — the same "lifted" cue as a card shadow, but tinted to the
    // theme instead of plain black so it reads as an active state, not
    // just elevation.
    inputFocused: {
      borderColor: theme.primaryColor,
      borderWidth: 1.5,
      shadowColor: theme.primaryColor,
      shadowOpacity: theme.scheme === "dark" ? 0.35 : 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
      elevation: 2,
    },
    inputError: { borderColor: colors.danger },
    error: { color: colors.danger, fontSize: 12, marginTop: 4 },
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, focused && !error && styles.inputFocused, error ? styles.inputError : null, style]}
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
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
