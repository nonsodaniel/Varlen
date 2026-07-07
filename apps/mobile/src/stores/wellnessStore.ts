import { create } from 'zustand';
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

export const useWellnessStore = create<WellnessState>((set, get) => ({
  entries: [],
  isLoading: false,

  fetchEntries: async () => {
    set({ isLoading: true });
    try {
      const res = await apiGet<{ data: any[] }>('/wellness');
      set({ entries: (res.data ?? []).map(mapEntry), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addEntry: async (entry) => {
    try {
      const body: Record<string, unknown> = {
        date: entry.date,
        mood: entry.mood,
        sleep: entry.sleep,
        water: entry.water,
        exercise: entry.exercise,
        note: entry.note,
      };
      const res = await apiPost<{ data: any }>('/wellness', body);
      const newEntry = res?.data ? mapEntry(res.data) : { ...entry, id: `temp-${Date.now()}` };
      set((s) => ({ entries: [newEntry, ...s.entries] }));
    } catch {
      set((s) => ({ entries: [{ ...entry, id: `temp-${Date.now()}` }, ...s.entries] }));
    }
  },

  updateEntry: async (id, updates) => {
    const prev = get().entries;
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
    try {
      await apiPatch(`/wellness/${id}`, updates as Record<string, unknown>);
    } catch {
      set({ entries: prev });
    }
  },

  deleteEntry: async (id) => {
    const prev = get().entries;
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
    try {
      await apiDelete(`/wellness/${id}`);
    } catch {
      set({ entries: prev });
    }
  },

  getTodayEntry: () => {
    const todayStr = new Date().toISOString().split('T')[0];
    return get().entries.find((e) => e.date === todayStr);
  },
}));
