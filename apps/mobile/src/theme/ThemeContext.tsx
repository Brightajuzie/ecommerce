import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { SettingsApi } from "../api/endpoints";

export interface Theme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string | null;
  logoUrl: string | null;
}

const DEFAULT_THEME: Theme = {
  primaryColor: "#16A34A",
  secondaryColor: "#0284C7",
  accentColor: null,
  logoUrl: null,
};

const ThemeContext = createContext<Theme>(DEFAULT_THEME);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: SettingsApi.get,
    staleTime: 5 * 60_000,
  });

  const theme: Theme = settingsQuery.data
    ? {
        primaryColor: settingsQuery.data.primaryColor,
        secondaryColor: settingsQuery.data.secondaryColor,
        accentColor: settingsQuery.data.accentColor,
        logoUrl: settingsQuery.data.logoUrl,
      }
    : DEFAULT_THEME;

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
