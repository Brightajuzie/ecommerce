import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { useAuthStore } from "./src/store/authStore";
import { useGuestCartStore } from "./src/store/guestCartStore";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AppContent() {
  const theme = useTheme();
  return (
    <>
      <RootNavigator />
      {/* Content is light-on-dark or dark-on-light depending on our own
          resolved scheme, not "auto" — the user can force dark/light
          independent of the device's own appearance setting. */}
      <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
    </>
  );
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrateGuestCart = useGuestCartStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
    hydrateGuestCart();
  }, [hydrate, hydrateGuestCart]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
