import { create } from 'zustand';

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,

  login: (user, accessToken, refreshToken) =>
    set({
      isAuthenticated: true,
      user,
      accessToken,
      refreshToken,
      isLoading: false,
    }),

  logout: () =>
    set({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
    }),

  setLoading: (isLoading) => set({ isLoading }),
}));
