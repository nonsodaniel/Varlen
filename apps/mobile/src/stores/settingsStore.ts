import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  appearance: 'light' | 'dark' | 'system';
  currency: string;
  currencySymbol: string;
  /** True once the user has explicitly chosen a currency (not just the default USD). */
  currencyConfigured: boolean;
  language: string;
  notificationsEnabled: boolean;
  hasOnboarded: boolean;
  lastAppVersion: string;
  /** When true, all screens show activities from every mode the user has. Default false (mode-isolated). */
  showCrossModeData: boolean;
  setAppearance: (appearance: 'light' | 'dark' | 'system') => void;
  setCurrency: (currency: string, symbol: string) => void;
  setLanguage: (language: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  markOnboarded: () => void;
  setLastAppVersion: (version: string) => void;
  setShowCrossModeData: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appearance: 'light',
      currency: 'USD',
      currencySymbol: '$',
      currencyConfigured: false,
      language: 'English',
      notificationsEnabled: true,
      hasOnboarded: false,
      lastAppVersion: '1.0.0',
      showCrossModeData: false,

      setAppearance: (appearance) => set({ appearance }),
      setCurrency: (currency, symbol) => set({ currency, currencySymbol: symbol, currencyConfigured: true }),
      setLanguage: (language) => set({ language }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      markOnboarded: () => set({ hasOnboarded: true }),
      setLastAppVersion: (version) => set({ lastAppVersion: version }),
      setShowCrossModeData: (show) => set({ showCrossModeData: show }),
    }),
    {
      name: 'sivena-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
