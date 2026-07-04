import { useAuthStore } from '../stores/authStore';

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

export async function apiPost<T>(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function apiPatch<T>(
  endpoint: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    ...(body && { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}
