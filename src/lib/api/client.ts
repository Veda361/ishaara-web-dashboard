import { ApiError } from "../errors";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://reposnse-ishaara.onrender.com";

const TOKEN_KEY = "ishaara_session_token";

let inMemoryToken: string | null = null;

export const authStorage = {
  getToken(): string | null {
    if (typeof window !== "undefined") {
      try {
        return inMemoryToken || localStorage.getItem(TOKEN_KEY);
      } catch {
        return inMemoryToken;
      }
    }
    return inMemoryToken;
  },

  setToken(token: string | null): void {
    inMemoryToken = token;
    if (typeof window !== "undefined") {
      try {
        if (token) {
          localStorage.setItem(TOKEN_KEY, token);
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch {
        // Ignore localStorage errors (e.g. incognito restrictions)
      }
    }
  },

  clearToken(): void {
    inMemoryToken = null;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch {
        // Ignore
      }
    }
  },
};

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  skipAuth?: boolean;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeoutMs = 15000, skipAuth = false, headers, credentials = "include", ...rest } = options;

  const isInternalApi = path.startsWith("/api/admin");
  let url: string;
  if (path.startsWith("http")) {
    url = path;
  } else if (isInternalApi) {
    if (typeof window !== "undefined" && window.location?.origin && !window.location.origin.includes("null")) {
      url = `${window.location.origin}${path}`;
    } else {
      url = `http://localhost:3000${path}`;
    }
  } else {
    url = `${API_BASE_URL}${path}`;
  }

  const requestHeaders = new Headers(headers);
  if (rest.body !== undefined && !requestHeaders.has("Content-Type") && !(rest.body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (!skipAuth) {
    const token = authStorage.getToken();
    if (token && !requestHeaders.has("Authorization")) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...rest,
      credentials,
      headers: requestHeaders,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle empty response (e.g. 204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const code =
        (typeof data === "object" && data !== null && (data.error?.code || data.code)) ||
        `HTTP_${response.status}`;
      const message =
        (typeof data === "object" && data !== null && (data.error?.message || data.message)) ||
        response.statusText ||
        "Request failed";
      const details = typeof data === "object" && data !== null ? data.error?.details : undefined;

      throw new ApiError(response.status, code, message, details);
    }

    return data as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(408, "TIMEOUT", "Request timed out. Please try again.");
    }
    const message = err instanceof Error ? err.message : "Network failure";
    throw new ApiError(0, "NETWORK_ERROR", message);
  }
}

export const apiClient = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>(path, { ...options, method: "GET" });
  },

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(path, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(path, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>(path, { ...options, method: "DELETE" });
  },
};
