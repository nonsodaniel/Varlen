import { create } from 'zustand';
import type { LifeMode } from '../types';
import { useHouseholdStore } from './householdStore';
import { useModeHouseholdStore } from './modeHouseholdStore';
import { clearAllStoreData } from '../services/syncRefetch';

interface ModeState {
  mode: LifeMode;
  setMode: (mode: LifeMode) => void;
  syncFromHousehold: () => void;
  resetSync: () => void;
}

// Tracks the last time the user explicitly switched modes.
let _lastExplicitModeSetAt = 0;
// Guards against fetchHousehold calls mid-session overriding the active mode.
// Reset to false on logout via resetSync().
let _hasSyncedModeFromServer = false;

export const useModeStore = create<ModeState>((set) => ({
  mode: 'personal',

  setMode: (mode) => {
    _lastExplicitModeSetAt = Date.now();
    // Once the user explicitly sets a mode, block any further server sync
    // so routine fetchHousehold calls can never override the current mode.
    _hasSyncedModeFromServer = true;
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
    // Only sync mode from the server once per session (cold start).
    // After the first sync — or once the user has explicitly set a mode —
    // never allow a fetchHousehold response to override the active session mode.
    // This prevents a household with a stale/wrong mode field from switching the
    // user's mode unexpectedly (e.g. parenting mode → couple after adding a child).
    if (_hasSyncedModeFromServer) return;
    // Also skip if the user explicitly switched mode within the last 10 seconds.
    if (Date.now() - _lastExplicitModeSetAt < 10000) return;
    const household = useHouseholdStore.getState().household;
    if (household?.mode) {
      _hasSyncedModeFromServer = true;
      set({ mode: household.mode });
    }
  },

  // Called on logout to allow re-sync on the next login's cold start.
  resetSync: () => {
    _lastExplicitModeSetAt = 0;
    _hasSyncedModeFromServer = false;
    set({ mode: 'personal' });
  },
}));
