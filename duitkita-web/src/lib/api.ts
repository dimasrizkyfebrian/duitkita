import axios, { type AxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/auth.store";
import { ApiEnvelopeError } from "@/lib/api-envelope";
import type { ErrorCode } from "@/lib/api-envelope";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request interceptor ──────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: success (auto-unwrap envelope) ─────────────
api.interceptors.response.use(
  (response) => {
    const isBlobOrBuffer =
      response.config.responseType === "blob" ||
      response.config.responseType === "arraybuffer";

    if (
      !isBlobOrBuffer &&
      response.data &&
      typeof response.data === "object" &&
      "success" in response.data &&
      response.data.success === true &&
      "data" in response.data
    ) {
      response.data = response.data.data;
    }

    return response;
  },
  undefined,
);

// ── Response interceptor: error (structured errors + refresh flow) ────

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function flushQueue(token: string | null, error: unknown) {
  for (const { resolve, reject } of pendingQueue) {
    if (token) resolve(token);
    else reject(error);
  }
  pendingQueue = [];
}

function forceLogout() {
  useAuthStore.getState().logout();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

api.interceptors.response.use(undefined, async (error) => {
  if (!axios.isAxiosError(error) || !error.response) {
    return Promise.reject(error);
  }

  const { status, data } = error.response;
  const originalConfig = error.config as AxiosRequestConfig & { _retry?: boolean };
  const isAuthEndpoint = originalConfig?.url?.includes("/auth/");

  // ── 401 handling with refresh token ──
  if (status === 401 && !isAuthEndpoint && !originalConfig._retry) {
    const { refreshToken } = useAuthStore.getState();

    if (!refreshToken) {
      forceLogout();
      return Promise.reject(toEnvelopeError(status, data));
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalConfig.headers = {
          ...originalConfig.headers,
          Authorization: `Bearer ${newToken}`,
        };
        return api(originalConfig);
      });
    }

    isRefreshing = true;
    originalConfig._retry = true;

    try {
      const { refreshAccessToken } = await import(
        "@/lib/services/auth.service"
      );
      const result = await refreshAccessToken(refreshToken);

      useAuthStore
        .getState()
        .setTokens(result.accessToken, result.refreshToken);
      useAuthStore.getState().updateUser(result.user);

      flushQueue(result.accessToken, null);

      originalConfig.headers = {
        ...originalConfig.headers,
        Authorization: `Bearer ${result.accessToken}`,
      };
      return api(originalConfig);
    } catch (refreshError) {
      flushQueue(null, refreshError);
      forceLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }

  // ── Structured error envelope ──
  return Promise.reject(toEnvelopeError(status, data));
});

function toEnvelopeError(status: number, data: unknown): unknown {
  if (
    data &&
    typeof data === "object" &&
    "success" in data &&
    (data as { success: boolean }).success === false &&
    "error" in data
  ) {
    const envelope = data as {
      success: false;
      error: { code: ErrorCode; message: string; details?: string[] };
      requestId: string;
    };

    return new ApiEnvelopeError(
      envelope.error.code,
      envelope.error.message,
      status,
      envelope.requestId,
      envelope.error.details,
    );
  }
  return data;
}

export default api;
