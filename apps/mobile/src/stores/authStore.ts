import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { disconnectSocket } from '../services/socket';
import { signOutGoogle } from '../services/googleAuth';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  householdId?: string;
  emailVerified?: boolean;
  avatarUrl?: string;
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

const AUTH_USER_KEY = '@sivena_user';
const AUTH_TOKENS_KEY = 'sivena_tokens'; // SecureStore key (no @ prefix needed)

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
    AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user)).catch(() => {});
    SecureStore.setItemAsync(AUTH_TOKENS_KEY, JSON.stringify({ accessToken, refreshToken })).catch(() => {});
  },

  logout: () => {
    // Disconnect realtime socket before clearing credentials
    disconnectSocket();
    // Sign out of Google so next login prompts account selection
    signOutGoogle();
    // Clear notification store and badge
    try {
      require('../stores/notificationStore').useNotificationStore.getState().clear();
      require('../services/pushNotifications').clearBadge();
    } catch {
      // Services may not be loaded yet
    }
    set({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
    });
    AsyncStorage.removeItem(AUTH_USER_KEY).catch(() => {});
    SecureStore.deleteItemAsync(AUTH_TOKENS_KEY).catch(() => {});
  },

  setLoading: (isLoading) => set({ isLoading }),

  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken });
    SecureStore.setItemAsync(AUTH_TOKENS_KEY, JSON.stringify({ accessToken, refreshToken })).catch(() => {});
  },

  loadStoredAuth: async () => {
    try {
      const [storedUser, storedTokens] = await Promise.all([
        AsyncStorage.getItem(AUTH_USER_KEY),
        SecureStore.getItemAsync(AUTH_TOKENS_KEY),
      ]);
      if (storedUser && storedTokens) {
        const user = JSON.parse(storedUser);
        const { accessToken, refreshToken } = JSON.parse(storedTokens);
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

  updateUser: (updates) => {
    set((state) => {
      const user = state.user ? { ...state.user, ...updates } : null;
      if (user) AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user)).catch(() => {});
      return { user };
    });
  },
}));
