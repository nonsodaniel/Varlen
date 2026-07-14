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

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  // If already refreshing, all callers share the same promise
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const { refreshToken } = useAuthStore.getState();
      if (!refreshToken) return false;

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
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

const REQUEST_TIMEOUT_MS = 15000;

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new TypeError('Network request failed');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRefresh(
  url: string,
  options: RequestInit,
): Promise<Response> {
  let response = await fetchWithTimeout(url, options);

  if (response.status === 401 && useAuthStore.getState().refreshToken) {
    try {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        const newHeaders = { ...options.headers, ...getAuthHeaders() };
        response = await fetchWithTimeout(url, { ...options, headers: newHeaders });
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
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed with status ${response.status}`);
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
    if (isNetworkError(error)) {
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
  const response = await fetchWithRefresh(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  return handleResponse<T>(response);
}
