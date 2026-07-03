import { create } from 'zustand';

interface SettingsState {
  appearance: 'light' | 'dark' | 'system';
  currency: string;
  currencySymbol: string;
  language: string;
  notificationsEnabled: boolean;
  isAuthenticated: boolean;
  setAppearance: (appearance: 'light' | 'dark' | 'system') => void;
  setCurrency: (currency: string, symbol: string) => void;
  setLanguage: (language: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  signOut: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  appearance: 'light',
  currency: 'USD',
  currencySymbol: '$',
  language: 'English',
  notificationsEnabled: true,
  isAuthenticated: true,

  setAppearance: (appearance) => set({ appearance }),
  setCurrency: (currency, symbol) => set({ currency, currencySymbol: symbol }),
  setLanguage: (language) => set({ language }),
  setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
  signOut: () => set({ isAuthenticated: false }),
}));
