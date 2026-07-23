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
    emailVerified: boolean;
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

interface RegisterResponse {
  message: string;
  user: { email: string; name: string };
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
  country?: string,
): Promise<RegisterResponse> {
  const res = await apiPost<any>('/auth/register', { name, email, password, ...(country ? { country } : {}) });
  return res.data ?? res;
}

export async function loginWithGoogle(
  idToken: string,
): Promise<AuthResponse> {
  const res = await apiPost<{ data: AuthResponse }>('/auth/google', { idToken });
  return unwrap(res);
}

export async function verifyEmail(
  email: string,
  code: string,
): Promise<AuthResponse> {
  const res = await apiPost<{ data: AuthResponse }>('/auth/verify-email', { email, code });
  return unwrap(res);
}

export async function resendVerification(email: string): Promise<void> {
  await apiPost('/auth/resend-verification', { email });
}

export async function forgotPassword(email: string): Promise<void> {
  await apiPost('/auth/forgot-password', { email });
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  await apiPost('/auth/reset-password', { email, code, newPassword });
}

export async function refreshTokens(
  refreshToken: string,
): Promise<AuthResponse> {
  const res = await apiPost<{ data: AuthResponse }>('/auth/refresh', { refreshToken });
  return unwrap(res);
}
