import { create } from 'zustand';
import type { LifeMode } from '../types';
import { useHouseholdStore } from './householdStore';
import { useModeHouseholdStore } from './modeHouseholdStore';
import { clearAllStoreData } from '../services/syncRefetch';

interface ModeState {
  mode: LifeMode;
  setMode: (mode: LifeMode) => void;
  syncFromHousehold: () => void;
}

export const useModeStore = create<ModeState>((set) => ({
  mode: 'couple',

  setMode: (mode) => {
    set({ mode });

    // Switch the active household to the one associated with this mode.
    // If no household exists for the mode yet, householdId becomes null and
    // will be auto-created the first time a piece of data is written.
    const modeHouseholdId = useModeHouseholdStore.getState().getModeHousehold(mode) ?? null;
    useHouseholdStore.setState({ householdId: modeHouseholdId });

    // Clear all cached data so screens re-fetch from the new mode's household
    clearAllStoreData();

    // Sync mode to the backend household (no-op if no household yet)
    useHouseholdStore.getState().setMode(mode);
  },

  syncFromHousehold: () => {
    const household = useHouseholdStore.getState().household;
    if (household?.mode) {
      set({ mode: household.mode });
    }
  },
}));
