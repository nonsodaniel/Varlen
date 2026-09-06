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
  mode: 'personal',

  setMode: (mode) => {
    set({ mode });

    // Switch the active household to exactly the one mapped to this mode.
    // If no dedicated household exists for this mode, set null — stores handle null by
    // returning empty data (never fall back to user.householdId which would expose another
    // mode's data). Personal mode is always seeded in _layout.tsx so it never hits null.
    const modeHouseholdId = useModeHouseholdStore.getState().getModeHousehold(mode) ?? null;

    useHouseholdStore.setState({ householdId: modeHouseholdId, members: [], household: null });

    // Clear all cached data so screens re-fetch from the new mode's household
    clearAllStoreData();

    // Sync mode to the backend household (no-op if no household yet)
    useHouseholdStore.getState().setMode(mode);

    // Immediately re-fetch household members/data for the new mode's household
    if (modeHouseholdId) {
      useHouseholdStore.getState().fetchHousehold();
    }
  },

  syncFromHousehold: () => {
    const household = useHouseholdStore.getState().household;
    if (household?.mode) {
      set({ mode: household.mode });
    }
  },
}));
