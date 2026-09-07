import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WellnessEntry } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';

interface WellnessState {
  entries: WellnessEntry[];
  isLoading: boolean;
  // Maps mode name → entry IDs created in that mode.
  // Used to filter server-returned entries to the current mode only.
  modeEntryIds: Record<string, string[]>;
  fetchEntries: () => Promise<void>;
  addEntry: (entry: Omit<WellnessEntry, 'id'>) => Promise<void>;
  updateEntry: (id: string, updates: Partial<WellnessEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  getTodayEntry: () => WellnessEntry | undefined;
}

function mapEntry(e: any): WellnessEntry {
  return {
    id: e.id,
    date: e.date?.split?.('T')?.[0] ?? e.date ?? '',
    mood: e.mood ?? 3,
    sleep: e.sleep ?? 0,
    water: e.water ?? 0,
    exercise: e.exercise ?? false,
    note: e.note ?? undefined,
    customMetrics: e.customMetrics ?? undefined,
  };
}

function getCurrentMode(): string {
  // Lazy require to avoid circular dependency
  return (require('./modeStore').useModeStore as any).getState().mode as string;
}

let _lastFetchedAt = 0;

export const useWellnessStore = create<WellnessState>()(
  persist(
    (set, get) => ({
  entries: [],
  isLoading: false,
  modeEntryIds: {},

  fetchEntries: async () => {
    const hasData = get().entries.length > 0;
    if (hasData && Date.now() - _lastFetchedAt < 30000) return;
    set({ isLoading: !hasData });
    try {
      const res = await apiGet<any>('/wellness');
      const raw = res.data ?? res;
      const arr = Array.isArray(raw) ? raw : [];
      _lastFetchedAt = Date.now();
      const currentMode = getCurrentMode();
      const modeIds = get().modeEntryIds[currentMode] as string[] | undefined;
      // Entries tagged in OTHER modes must never appear in the current mode.
      // If current mode has no explicit tags yet, show only entries not claimed by another mode.
      const otherModeIds = new Set(
        Object.entries(get().modeEntryIds)
          .filter(([m]) => m !== currentMode)
          .flatMap(([, ids]) => ids ?? [])
      );
      const filtered = modeIds
        ? arr.filter((e: any) => modeIds.includes(e.id))
        : arr.filter((e: any) => !otherModeIds.has(e.id));
      set({ entries: filtered.map(mapEntry), isLoading: false });
    } catch (err) {
      console.warn('[wellnessStore] fetchEntries failed:', err);
      set({ isLoading: false });
    }
  },

  addEntry: async (entry) => {
    const tempId = `temp-${Date.now()}`;
    set((s) => ({ entries: [{ ...entry, id: tempId }, ...s.entries] }));
    try {
      const body: Record<string, unknown> = {
        date: entry.date,
        mood: entry.mood,
        sleep: entry.sleep,
        water: entry.water,
        exercise: entry.exercise,
        note: entry.note,
        customMetrics: entry.customMetrics,
      };
      const res = await apiPost<any>('/wellness', body);
      const created = res?.data ?? res;
      if (created?.id) {
        set((s) => ({ entries: s.entries.map((e) => e.id === tempId ? mapEntry(created) : e) }));
        // Tag this entry with the current mode so future fetches scope correctly
        const currentMode = getCurrentMode();
        set((s) => ({
          modeEntryIds: {
            ...s.modeEntryIds,
            [currentMode]: [...(s.modeEntryIds[currentMode] ?? []), created.id],
          },
        }));
      }
    } catch (err) {
      console.warn('[wellnessStore] addEntry failed:', err);
      set((s) => ({ entries: s.entries.filter((e) => e.id !== tempId) }));
    }
  },

  updateEntry: async (id, updates) => {
    const prev = get().entries;
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
    try {
      await apiPatch(`/wellness/${id}`, updates as Record<string, unknown>);
    } catch (err) {
      console.warn('[wellnessStore] updateEntry failed:', err);
      set({ entries: prev });
    }
  },

  deleteEntry: async (id) => {
    const prev = get().entries;
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
    try {
      await apiDelete(`/wellness/${id}`);
      // Remove from mode tag map too
      set((s) => ({
        modeEntryIds: Object.fromEntries(
          Object.entries(s.modeEntryIds).map(([mode, ids]) => [
            mode,
            ids.filter((eid) => eid !== id),
          ])
        ),
      }));
    } catch (err) {
      console.warn('[wellnessStore] deleteEntry failed:', err);
      set({ entries: prev });
    }
  },

  getTodayEntry: () => {
    const todayStr = new Date().toISOString().split('T')[0];
    return get().entries.find((e) => e.date === todayStr);
  },
    }),
    {
      name: 'sivena-wellness',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ entries: state.entries, modeEntryIds: state.modeEntryIds }),
    },
  ),
);
