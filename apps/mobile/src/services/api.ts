import { useAuthStore } from '../stores/authStore';
import { enqueueRequest, useOfflineStore } from './offlineQueue';

const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api/v1'
  : 'https://sivena-api-production.up.railway.app/api/v1';

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
    } catch {
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
): Promise<Response> {
  let response = await fetch(url, options);

  if (response.status === 401 && useAuthStore.getState().refreshToken) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newHeaders = { ...options.headers, ...getAuthHeaders() };
      response = await fetch(url, { ...options, headers: newHeaders });
    } else {
      useAuthStore.getState().logout();
    }
  }

  return response;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }
  return response.json();
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
