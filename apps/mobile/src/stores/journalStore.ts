import { create } from 'zustand';
import type { JournalEntry } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';

interface JournalState {
  entries: JournalEntry[];
  isLoading: boolean;
  fetchEntries: () => Promise<void>;
  addEntry: (entry: Omit<JournalEntry, 'id'>) => Promise<void>;
  updateEntry: (id: string, updates: Partial<JournalEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
}

function mapEntry(e: any): JournalEntry {
  return {
    id: e.id,
    date: e.date ?? e.createdAt?.split('T')[0] ?? '',
    mood: e.mood ?? 3,
    gratitude: e.gratitude ?? '',
    note: e.note ?? e.content ?? '',
    createdBy: e.createdById ?? e.userId ?? e.createdBy ?? '',
  };
}

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: [],
  isLoading: false,

  fetchEntries: async () => {
    set({ isLoading: true });
    try {
      const res = await apiGet<{ data: any[] }>('/journal');
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
        gratitude: entry.gratitude,
        note: entry.note,
      };
      const res = await apiPost<{ data: any }>('/journal', body);
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
      await apiPatch(`/journal/${id}`, updates as Record<string, unknown>);
    } catch {
      set({ entries: prev });
    }
  },

  deleteEntry: async (id) => {
    const prev = get().entries;
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
    try {
      await apiDelete(`/journal/${id}`);
    } catch {
      set({ entries: prev });
    }
  },
}));
