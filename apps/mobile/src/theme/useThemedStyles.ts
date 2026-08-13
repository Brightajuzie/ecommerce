import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useTheme, type Theme } from "./ThemeContext";
import type { ThemeColors } from "./colors";

/**
 * Drop-in replacement for a module-level `StyleSheet.create({...})` when a
 * style block needs to react to light/dark mode. Pass a factory that builds
 * the style object from the resolved color tokens (plus the full theme, for
 * the rare style that also needs `primaryColor`) — it's recomputed only
 * when the theme actually changes, not on every render.
 *
 * Usage: `const styles = useThemedStyles((colors) => ({ container: { backgroundColor: colors.background } }));`
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors, theme: Theme) => T,
): T {
  const theme = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => StyleSheet.create(factory(theme.colors, theme)), [theme]);
}
