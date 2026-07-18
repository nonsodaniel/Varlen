'use client';

import { create } from 'zustand';
import { apiPost, ApiError } from './api';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loadToken: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    try {
      const res = await apiPost<{ accessToken: string }>('/auth/login', {
        email,
        password,
      });
      const token = res.accessToken || (res as any).access_token;
      if (token) {
        localStorage.setItem('admin_token', token);
        set({ token, isAuthenticated: true });
        return { success: true };
      }
      return { success: false, error: 'No token received' };
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Something went wrong';
      return { success: false, error: message };
    }
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    // Keep admin_remembered_email if it exists (user opted in to remember)
    set({ token: null, isAuthenticated: false });
  },

  loadToken: () => {
    const token = localStorage.getItem('admin_token');
    set({
      token,
      isAuthenticated: !!token,
      isLoading: false,
    });
  },
}));
