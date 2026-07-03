const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api/v1'
  : 'https://api.valen.app/api/v1';

export async function apiPost<T>(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}
