import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet } from '../services/api';

interface FlagEntry {
  key: string;
  label: string;
}

interface FeatureFlagsState {
  flags: Record<string, boolean>;
  isLoaded: boolean;
  fetchFlags: () => Promise<void>;
  isEnabled: (key: string) => boolean;
  reset: () => void;
}

export const useFeatureFlagsStore = create<FeatureFlagsState>()(
  persist(
    (set, get) => ({
      flags: {},
      isLoaded: false,

      fetchFlags: async () => {
        try {
          const data = await apiGet<FlagEntry[]>('/admin/feature-flags/enabled');
          if (Array.isArray(data)) {
            const map: Record<string, boolean> = {};
            for (const f of data) {
              map[f.key] = true;
            }
            set({ flags: map, isLoaded: true });
          }
        } catch {
          // Keep cached flags if fetch fails, just mark loaded
          set({ isLoaded: true });
        }
      },

      isEnabled: (key: string) => get().flags[key] === true,

      reset: () => set({ flags: {}, isLoaded: false }),
    }),
    {
      name: 'feature-flags',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ flags: state.flags }),
    },
  ),
);
