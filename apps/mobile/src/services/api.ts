import { useAuthStore } from '../stores/authStore';
import { enqueueRequest, useOfflineStore } from './offlineQueue';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://sivena-api-production.up.railway.app/api/v1';

export { API_BASE_URL };

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

// ── Timeout-aware fetch ──
// Uses Promise.race so the timeout fires even if AbortController.abort()
// doesn't interrupt the fetch — a known issue on iOS Hermes release builds.

const REQUEST_TIMEOUT_MS = 15000;
const UPLOAD_TIMEOUT_MS = 60000;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new TypeError('Network request failed'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      fetch(url, { ...options, signal: controller.signal }),
      timeoutPromise,
    ]);
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new TypeError('Network request failed');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Token refresh ──

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  // If already refreshing, all callers share the same promise
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const { refreshToken } = useAuthStore.getState();
      if (!refreshToken) return false;

      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const result = await response.json();
      const data = result.data ?? result;
      useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch (err) {
      console.warn('[api] tryRefreshToken failed:', err);
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function fetchWithRefresh(
  url: string,
  options: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  let response = await fetchWithTimeout(url, options, timeoutMs);

  if (response.status === 401 && useAuthStore.getState().refreshToken) {
    try {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        const newHeaders = { ...options.headers, ...getAuthHeaders() };
        response = await fetchWithTimeout(url, { ...options, headers: newHeaders }, timeoutMs);
      } else {
        // Refresh token was explicitly rejected by server — logout
        useAuthStore.getState().logout();
      }
    } catch {
      // Network error during refresh — don't logout, let the caller handle it
      throw new TypeError('Network request failed');
    }
  }

  return response;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err: any = new Error(body.message || `Request failed with status ${response.status}`);
    err.statusCode = response.status;
    err.error = body.error;
    err.response = body;
    throw err;
  }

  // Handle empty responses (e.g., 204 No Content)
  const text = await response.text();
  if (!text) return {} as T;

  const json = JSON.parse(text);

  // Unwrap the backend's TransformResponseInterceptor envelope.
  // The interceptor wraps ALL responses as { data: T, meta: { timestamp: string } }.
  // Without unwrapping, services that also return { data: [...], meta: {...} } for
  // pagination become double-wrapped and stores receive objects instead of arrays.
  if (
    json &&
    typeof json === 'object' &&
    !Array.isArray(json) &&
    'data' in json &&
    json.meta?.timestamp
  ) {
    return json.data;
  }

  return json;
}

// ── Network error detection ──

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Network request failed') {
    return true;
  }
  return false;
}

// ── API methods with offline queue support ──

// Auth endpoints must never be queued — they require immediate success/failure
// feedback and return tokens that must be stored synchronously.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/google', '/auth/apple', '/auth/refresh', '/auth/verify-email', '/auth/resend-verification', '/auth/forgot-password', '/auth/reset-password', '/auth/logout', '/auth/change-password'];

export async function apiPost<T>(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<T> {
  try {
    const response = await fetchWithRefresh(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    });
    return handleResponse<T>(response);
  } catch (error) {
    if (isNetworkError(error) && !AUTH_ENDPOINTS.includes(endpoint)) {
      await enqueueRequest('POST', endpoint, body, getAuthHeaders());
      // Return a minimal response so optimistic UI still works
      return { data: { id: `offline-${Date.now()}`, ...body } } as T;
    }
    throw error;
  }
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  // GET requests are not queued — they fail gracefully and stores use cached data
  const response = await fetchWithRefresh(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  return handleResponse<T>(response);
}

export async function apiPatch<T>(
  endpoint: string,
  body?: Record<string, unknown>,
): Promise<T> {
  try {
    const response = await fetchWithRefresh(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      ...(body && { body: JSON.stringify(body) }),
    });
    return handleResponse<T>(response);
  } catch (error) {
    if (isNetworkError(error)) {
      await enqueueRequest('PATCH', endpoint, body, getAuthHeaders());
      return { data: body ?? {} } as T;
    }
    throw error;
  }
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetchWithRefresh(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return handleResponse<T>(response);
  } catch (error) {
    if (isNetworkError(error)) {
      await enqueueRequest('DELETE', endpoint, undefined, getAuthHeaders());
      return {} as T;
    }
    throw error;
  }
}

export async function apiUpload<T>(
  endpoint: string,
  formData: FormData,
): Promise<T> {
  // Uploads are not queued — they require the actual file data
  // Use extended timeout for file uploads (60s) to handle slow Android connections
  const response = await fetchWithRefresh(
    `${API_BASE_URL}${endpoint}`,
    {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: formData,
    },
    UPLOAD_TIMEOUT_MS,
  );
  return handleResponse<T>(response);
}
