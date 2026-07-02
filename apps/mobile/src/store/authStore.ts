import { create } from "zustand";
import type { UserDto } from "@ikstore/shared";
import { secureStorage } from "./secureStorage";

const ACCESS_TOKEN_KEY = "ikstore.accessToken";
const REFRESH_TOKEN_KEY = "ikstore.refreshToken";
const USER_KEY = "ikstore.user";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserDto | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (accessToken: string, refreshToken: string, user: UserDto) => Promise<void>;
  updateTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isHydrated: false,

  hydrate: async () => {
    const [accessToken, refreshToken, userJson] = await Promise.all([
      secureStorage.getItem(ACCESS_TOKEN_KEY),
      secureStorage.getItem(REFRESH_TOKEN_KEY),
      secureStorage.getItem(USER_KEY),
    ]);
    set({
      accessToken,
      refreshToken,
      user: userJson ? (JSON.parse(userJson) as UserDto) : null,
      isHydrated: true,
    });
  },

  setSession: async (accessToken, refreshToken, user) => {
    await Promise.all([
      secureStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
      secureStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
      secureStorage.setItem(USER_KEY, JSON.stringify(user)),
    ]);
    set({ accessToken, refreshToken, user });
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
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));
