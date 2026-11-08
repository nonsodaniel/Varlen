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
  familyModeType: 'family' | 'friends';
  setModeHousehold: (mode: LifeMode, householdId: string) => void;
  getModeHousehold: (mode: LifeMode) => string | undefined;
  activateMode: (mode: LifeMode) => void;
  setFamilyModeType: (type: 'family' | 'friends') => void;
  clearAll: () => void;
}

export const useModeHouseholdStore = create<ModeHouseholdState>()(
  persist(
    (set, get) => ({
      ids: {},
      activatedModes: ['personal'] as LifeMode[],
      familyModeType: 'family' as 'family' | 'friends',

      setModeHousehold: (mode, householdId) =>
        set((s) => ({ ids: { ...s.ids, [mode]: householdId } })),

      getModeHousehold: (mode) => get().ids[mode],

      activateMode: (mode) =>
        set((s) => ({
          activatedModes: s.activatedModes.includes(mode)
            ? s.activatedModes
            : [...s.activatedModes, mode],
        })),

      setFamilyModeType: (type) => set({ familyModeType: type }),

      clearAll: () => set({ ids: {}, activatedModes: ['personal'], familyModeType: 'family' }),
    }),
    {
      name: 'sivena-mode-households',
      storage: createJSONStorage(() => AsyncStorage),
      // Deep-merge ids so any in-memory setModeHousehold calls made during the
      // async hydration window on Android are not overwritten by the persisted state.
      merge: (persistedState: any, currentState: ModeHouseholdState) => ({
        ...currentState,
        ...persistedState,
        // Current (in-memory) ids take priority over persisted ids so that a
        // setModeHousehold call that races with hydration is never lost.
        ids: { ...(persistedState?.ids ?? {}), ...(currentState?.ids ?? {}) },
      }),
      // After hydration completes, re-sync householdId to the correct mode household.
      // Fixes the Android cold-start race where fetchHousehold ran before this store
      // had hydrated and fell back to the personal household instead of couple/family.
      onRehydrateStorage: () => (_state, error) => {
        if (error || !_state) return;
        try {
          const { useModeStore } = require('./modeStore');
          const { useHouseholdStore } = require('./householdStore');
          const mode = useModeStore.getState().mode;
          const modeHid = _state.getModeHousehold(mode) ?? null;
          const currentHid = useHouseholdStore.getState().householdId;
          if (modeHid && modeHid !== currentHid) {
            useHouseholdStore.setState({ householdId: modeHid, members: [], household: null });
            useHouseholdStore.getState().fetchHousehold();
          }
        } catch {}
      },
    },
  ),
);
