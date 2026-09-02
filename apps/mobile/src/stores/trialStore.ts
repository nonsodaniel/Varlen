import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PremiumFeature } from '../constants/premiumFeatures';

interface TrialState {
  usageCounts: Partial<Record<PremiumFeature, number>>;
  getCount: (feature: PremiumFeature) => number;
  increment: (feature: PremiumFeature) => number; // returns new count after increment
  reset: () => void;
}

export const useTrialStore = create<TrialState>()(
  persist(
    (set, get) => ({
      usageCounts: {},

      getCount: (feature) => get().usageCounts[feature] ?? 0,

      increment: (feature) => {
        const next = (get().usageCounts[feature] ?? 0) + 1;
        set((state) => ({
          usageCounts: { ...state.usageCounts, [feature]: next },
        }));
        return next;
      },

      reset: () => set({ usageCounts: {} }),
    }),
    {
      name: 'sivena-trials',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
