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
  activatedModes: LifeMode[];
  setModeHousehold: (mode: LifeMode, householdId: string) => void;
  getModeHousehold: (mode: LifeMode) => string | undefined;
  activateMode: (mode: LifeMode) => void;
  clearAll: () => void;
}

export const useModeHouseholdStore = create<ModeHouseholdState>()(
  persist(
    (set, get) => ({
      ids: {},
      activatedModes: ['personal'] as LifeMode[],

      setModeHousehold: (mode, householdId) =>
        set((s) => ({ ids: { ...s.ids, [mode]: householdId } })),

      getModeHousehold: (mode) => get().ids[mode],

      activateMode: (mode) =>
        set((s) => ({
          activatedModes: s.activatedModes.includes(mode)
            ? s.activatedModes
            : [...s.activatedModes, mode],
        })),

      clearAll: () => set({ ids: {}, activatedModes: ['personal'] }),
    }),
    {
      name: 'sivena-mode-households',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
