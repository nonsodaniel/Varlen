import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  appearance: 'light' | 'dark' | 'system';
  currency: string;
  currencySymbol: string;
  language: string;
  notificationsEnabled: boolean;
  hasOnboarded: boolean;
  lastAppVersion: string;
  setAppearance: (appearance: 'light' | 'dark' | 'system') => void;
  setCurrency: (currency: string, symbol: string) => void;
  setLanguage: (language: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  markOnboarded: () => void;
  setLastAppVersion: (version: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appearance: 'light',
      currency: 'USD',
      currencySymbol: '$',
      language: 'English',
      notificationsEnabled: true,
      hasOnboarded: false,
      lastAppVersion: '1.0.0',

      setAppearance: (appearance) => set({ appearance }),
      setCurrency: (currency, symbol) => set({ currency, currencySymbol: symbol }),
      setLanguage: (language) => set({ language }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      markOnboarded: () => set({ hasOnboarded: true }),
      setLastAppVersion: (version) => set({ lastAppVersion: version }),
    }),
    {
      name: 'sivena-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
