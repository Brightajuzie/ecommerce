import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";

const PRODUCTION_API_URL = "https://ikaystores-api.onrender.com/api/v1";

const LOCAL_DEV_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d+\.\d+)(:\d+)?\//;

// .env is gitignored, so a hosted build (e.g. Vercel) without EXPO_PUBLIC_API_URL
// set in its dashboard would otherwise ship a bundle pointing at localhost. A
// local release build (gradle bundleRelease) does read .env, so a dev-machine
// URL is ignored outside __DEV__ — on a phone "localhost" is the phone itself.
const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;
export const API_URL = __DEV__
  ? ENV_API_URL || "http://localhost:3001/api/v1"
  : ENV_API_URL && !LOCAL_DEV_HOST.test(ENV_API_URL)
    ? ENV_API_URL
    : PRODUCTION_API_URL;

// The API runs on Render's free tier, which sleeps when idle and takes ~45s to
// wake. The timeout leaves room for that, and idempotent requests that fail while
// it's waking (network error / gateway 502-504) are retried with backoff.
export const apiClient = axios.create({ baseURL: API_URL, timeout: 60_000 });

const WAKE_RETRY_DELAYS_MS = [2_000, 5_000, 10_000];
const RETRYABLE_METHODS = new Set(["get", "head", "options"]);

function isWakingServerError(error: AxiosError): boolean {
  if (!error.response) {
    return error.code !== "ECONNABORTED" && error.code !== "ERR_CANCELED";
  }
  return [502, 503, 504].includes(error.response.status);
}

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
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean; _wakeAttempt?: number })
      | undefined;

    if (
      originalRequest &&
      RETRYABLE_METHODS.has((originalRequest.method ?? "get").toLowerCase()) &&
      isWakingServerError(error)
    ) {
      const attempt = originalRequest._wakeAttempt ?? 0;
      if (attempt < WAKE_RETRY_DELAYS_MS.length) {
        originalRequest._wakeAttempt = attempt + 1;
        await new Promise((resolve) => setTimeout(resolve, WAKE_RETRY_DELAYS_MS[attempt]));
        return apiClient(originalRequest);
      }
    }

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
