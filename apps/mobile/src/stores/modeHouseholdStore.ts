/**
 * Persists the mapping between each LifeMode and its dedicated household ID.
 * This enables strict data isolation per mode — switching modes switches which
 * household (and therefore whose data) is shown.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LifeMode } from '../types';

interface ModeHouseholdState {
  ids: Partial<Record<LifeMode, string>>;
  setModeHousehold: (mode: LifeMode, householdId: string) => void;
  getModeHousehold: (mode: LifeMode) => string | undefined;
  clearAll: () => void;
}

export const useModeHouseholdStore = create<ModeHouseholdState>()(
  persist(
    (set, get) => ({
      ids: {},

      setModeHousehold: (mode, householdId) =>
        set((s) => ({ ids: { ...s.ids, [mode]: householdId } })),

      getModeHousehold: (mode) => get().ids[mode],

      clearAll: () => set({ ids: {} }),
    }),
    {
      name: 'sivena-mode-households',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
