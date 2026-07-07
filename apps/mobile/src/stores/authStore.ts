import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  householdId?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  hasCheckedStorage: boolean;
  login: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  loadStoredAuth: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => void;
}

const AUTH_STORAGE_KEY = '@sivena_auth';

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  hasCheckedStorage: false,

  login: (user, accessToken, refreshToken) => {
    set({
      isAuthenticated: true,
      user,
      accessToken,
      refreshToken,
      isLoading: false,
    });
    AsyncStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ user, accessToken, refreshToken }),
    ).catch(() => {});
  },

  logout: () => {
    set({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
    });
    AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
  },

  setLoading: (isLoading) => set({ isLoading }),

  setTokens: (accessToken, refreshToken) => {
    const { user } = get();
    set({ accessToken, refreshToken });
    if (user) {
      AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ user, accessToken, refreshToken }),
      ).catch(() => {});
    }
  },

  loadStoredAuth: async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const { user, accessToken, refreshToken } = JSON.parse(stored);
        set({
          isAuthenticated: true,
          user,
          accessToken,
          refreshToken,
          hasCheckedStorage: true,
        });
      } else {
        set({ hasCheckedStorage: true });
      }
    } catch {
      set({ hasCheckedStorage: true });
    }
  },

  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),
}));
