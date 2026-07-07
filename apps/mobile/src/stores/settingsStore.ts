import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  appearance: 'light' | 'dark' | 'system';
  currency: string;
  currencySymbol: string;
  language: string;
  notificationsEnabled: boolean;
  setAppearance: (appearance: 'light' | 'dark' | 'system') => void;
  setCurrency: (currency: string, symbol: string) => void;
  setLanguage: (language: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appearance: 'system',
      currency: 'USD',
      currencySymbol: '$',
      language: 'English',
      notificationsEnabled: true,

      setAppearance: (appearance) => set({ appearance }),
      setCurrency: (currency, symbol) => set({ currency, currencySymbol: symbol }),
      setLanguage: (language) => set({ language }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
    }),
    {
      name: 'sivena-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
