import { create } from "zustand";
import type { UserDto } from "@ikstore/shared";
import { secureStorage } from "./secureStorage";

const ACCESS_TOKEN_KEY = "ikstore.accessToken";
const REFRESH_TOKEN_KEY = "ikstore.refreshToken";
const USER_KEY = "ikstore.user";
const BIOMETRIC_ENABLED_KEY = "ikstore.biometricEnabled";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserDto | null;
  isHydrated: boolean;
  biometricEnabled: boolean;
  isUnlocked: boolean;
  hydrate: () => Promise<void>;
  setSession: (accessToken: string, refreshToken: string, user: UserDto) => Promise<void>;
  updateTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  unlock: () => void;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isHydrated: false,
  biometricEnabled: false,
  isUnlocked: true,

  hydrate: async () => {
    const [accessToken, refreshToken, userJson, biometricFlag] = await Promise.all([
      secureStorage.getItem(ACCESS_TOKEN_KEY),
      secureStorage.getItem(REFRESH_TOKEN_KEY),
      secureStorage.getItem(USER_KEY),
      secureStorage.getItem(BIOMETRIC_ENABLED_KEY),
    ]);
    const user = userJson ? (JSON.parse(userJson) as UserDto) : null;
    const biometricEnabled = biometricFlag === "true";
    set({
      accessToken,
      refreshToken,
      user,
      biometricEnabled,
      isUnlocked: !(user && biometricEnabled),
      isHydrated: true,
    });
  },

  setSession: async (accessToken, refreshToken, user) => {
    await Promise.all([
      secureStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
      secureStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
      secureStorage.setItem(USER_KEY, JSON.stringify(user)),
    ]);
    set({ accessToken, refreshToken, user, isUnlocked: true });
  },

  updateTokens: async (accessToken, refreshToken) => {
    await Promise.all([
      secureStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
      secureStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
    ]);
    set({ accessToken, refreshToken });
  },

  logout: async () => {
    await Promise.all([
      secureStorage.deleteItem(ACCESS_TOKEN_KEY),
      secureStorage.deleteItem(REFRESH_TOKEN_KEY),
      secureStorage.deleteItem(USER_KEY),
    ]);
    set({ accessToken: null, refreshToken: null, user: null, isUnlocked: true });
  },

  unlock: () => set({ isUnlocked: true }),

  setBiometricEnabled: async (enabled: boolean) => {
    await secureStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? "true" : "false");
    set({ biometricEnabled: enabled, isUnlocked: get().isUnlocked || !enabled });
  },
}));
