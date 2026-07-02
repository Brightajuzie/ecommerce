import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

export const apiClient = axios.create({ baseURL: API_URL });

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, updateTokens, logout } = useAuthStore.getState();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
    const { accessToken, refreshToken: newRefreshToken } = response.data;
    await updateTokens(accessToken, newRefreshToken);
    return accessToken;
  } catch {
    await logout();
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;
      if (newAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  },
);
