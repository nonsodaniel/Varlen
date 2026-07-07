import { apiPost } from './api';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    householdId?: string;
  };
}

function unwrap(res: any): AuthResponse {
  return res.data ?? res;
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await apiPost<{ data: AuthResponse }>('/auth/login', { email, password });
  return unwrap(res);
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await apiPost<{ data: AuthResponse }>('/auth/register', { name, email, password });
  return unwrap(res);
}

export async function loginWithGoogle(
  idToken: string,
): Promise<AuthResponse> {
  const res = await apiPost<{ data: AuthResponse }>('/auth/google', { idToken });
  return unwrap(res);
}

export async function forgotPassword(email: string): Promise<void> {
  await apiPost('/auth/forgot-password', { email });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  await apiPost('/auth/reset-password', { token, newPassword });
}

export async function refreshTokens(
  refreshToken: string,
): Promise<AuthResponse> {
  const res = await apiPost<{ data: AuthResponse }>('/auth/refresh', { refreshToken });
  return unwrap(res);
}
