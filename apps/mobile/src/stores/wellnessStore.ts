import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WellnessEntry } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';

interface WellnessState {
  entries: WellnessEntry[];
  isLoading: boolean;
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
  };
}

export const useWellnessStore = create<WellnessState>()(
  persist(
    (set, get) => ({
  entries: [],
  isLoading: false,

  fetchEntries: async () => {
    set({ isLoading: true });
    try {
      const res = await apiGet<any>('/wellness');
      const raw = res.data ?? res;
      const arr = Array.isArray(raw) ? raw : [];
      set({ entries: arr.map(mapEntry), isLoading: false });
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
      };
      const res = await apiPost<any>('/wellness', body);
      const created = res?.data ?? res;
      if (created?.id) {
        set((s) => ({ entries: s.entries.map((e) => e.id === tempId ? mapEntry(created) : e) }));
      }
    } catch (err) {
      console.warn('[wellnessStore] addEntry failed:', err);
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
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
);
