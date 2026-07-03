import { apiPost } from './api';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/auth/login', { email, password });
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/auth/register', { name, email, password });
}

export async function loginWithGoogle(
  idToken: string,
): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/auth/google', { idToken });
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
  return apiPost<AuthResponse>('/auth/refresh', { refreshToken });
}
