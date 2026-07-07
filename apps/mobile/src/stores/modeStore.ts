import { create } from 'zustand';
import type { LifeMode } from '../types';
import { useHouseholdStore } from './householdStore';

interface ModeState {
  mode: LifeMode;
  setMode: (mode: LifeMode) => void;
  syncFromHousehold: () => void;
}

export const useModeStore = create<ModeState>((set) => ({
  mode: 'couple',

  setMode: (mode) => {
    set({ mode });
    useHouseholdStore.getState().setMode(mode);
  },

  syncFromHousehold: () => {
    const household = useHouseholdStore.getState().household;
    if (household?.mode) {
      set({ mode: household.mode });
    }
  },
}));
