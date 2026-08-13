import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { SettingsApi } from "../api/endpoints";
import { secureStorage } from "../store/secureStorage";
import { darkColors, lightColors, type ThemeColors } from "./colors";

export type ColorScheme = "light" | "dark";
/** User preference: "system" follows the device's Appearance setting. */
export type ThemeModePreference = ColorScheme | "system";

export interface Theme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string | null;
  logoUrl: string | null;
  /** Resolved light/dark scheme actually in effect right now. */
  scheme: ColorScheme;
  /** Neutral UI palette for the resolved scheme — see theme/colors.ts. */
  colors: ThemeColors;
  /** The user's raw preference (light/dark/system), for driving a settings toggle. */
  mode: ThemeModePreference;
  setMode: (mode: ThemeModePreference) => void;
}

const DEFAULT_BRAND = {
  primaryColor: "#15803D",
  secondaryColor: "#65A30D",
  accentColor: "#ECFDF5" as string | null,
  logoUrl: null as string | null,
};

const THEME_MODE_STORAGE_KEY = "themeMode";

const ThemeContext = createContext<Theme>({
  ...DEFAULT_BRAND,
  scheme: "light",
  colors: lightColors,
  mode: "system",
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: SettingsApi.get,
    staleTime: 5 * 60_000,
  });

  const [mode, setModeState] = useState<ThemeModePreference>("system");
  const [systemScheme, setSystemScheme] = useState<ColorScheme>(
    Appearance.getColorScheme() === "dark" ? "dark" : "light",
  );

  // Load the persisted preference once on mount. Defaults to "system" (the
  // synchronous Appearance read above) until this resolves, so there's no
  // flash of the wrong scheme on cold start.
  useEffect(() => {
    secureStorage.getItem(THEME_MODE_STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setModeState(stored);
      }
    });
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === "dark" ? "dark" : "light");
    });
    return () => subscription.remove();
  }, []);

  const setMode = (next: ThemeModePreference) => {
    setModeState(next);
    secureStorage.setItem(THEME_MODE_STORAGE_KEY, next).catch(() => {});
  };

  const scheme: ColorScheme = mode === "system" ? systemScheme : mode;

  const brand = settingsQuery.data
    ? {
        primaryColor: settingsQuery.data.primaryColor,
        secondaryColor: settingsQuery.data.secondaryColor,
        accentColor: settingsQuery.data.accentColor,
        logoUrl: settingsQuery.data.logoUrl,
      }
    : DEFAULT_BRAND;

  const theme: Theme = useMemo(
    () => ({
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor,
      // The admin-configured accent is a pale, near-white tint meant for
      // light chip/badge fills — it has no legible equivalent on a dark
      // surface, so dark mode substitutes a fixed dark-green tint instead
      // of whatever pastel the admin picked, regardless of that setting.
      accentColor: scheme === "dark" ? "#132A1C" : brand.accentColor,
      logoUrl: brand.logoUrl,
      scheme,
      colors: scheme === "dark" ? darkColors : lightColors,
      mode,
      setMode,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [brand.primaryColor, brand.secondaryColor, brand.accentColor, brand.logoUrl, scheme, mode],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
