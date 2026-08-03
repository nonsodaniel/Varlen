import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    title: e.gratitude ?? '',
    note: e.note ?? e.content ?? '',
    createdBy: e.createdById ?? e.userId ?? e.createdBy ?? '',
  };
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
  entries: [],
  isLoading: false,

  fetchEntries: async () => {
    set({ isLoading: true });
    try {
      const res = await apiGet<any>('/journal');
      const raw = res.data ?? res;
      const arr = Array.isArray(raw) ? raw : [];
      set({ entries: arr.map(mapEntry), isLoading: false });
    } catch (err) {
      console.warn('[journalStore] fetchEntries failed:', err);
      set({ isLoading: false });
    }
  },

  addEntry: async (entry) => {
    const tempId = `temp-${Date.now()}`;
    set((s) => ({ entries: [{ ...entry, id: tempId }, ...s.entries] }));
    try {
      const body: Record<string, unknown> = {
        date: entry.date,
        gratitude: entry.title ?? '',
        note: entry.note,
      };
      const res = await apiPost<any>('/journal', body);
      const created = res?.data ?? res;
      if (created?.id) {
        set((s) => ({ entries: s.entries.map((e) => e.id === tempId ? mapEntry(created) : e) }));
      }
    } catch (err) {
      console.warn('[journalStore] addEntry failed:', err);
    }
  },

  updateEntry: async (id, updates) => {
    const prev = get().entries;
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
    try {
      const body: Record<string, unknown> = { ...updates };
      if ('title' in updates) {
        body.gratitude = updates.title ?? '';
        delete body.title;
      }
      await apiPatch(`/journal/${id}`, body);
    } catch (err) {
      console.warn('[journalStore] updateEntry failed:', err);
      set({ entries: prev });
    }
  },

  deleteEntry: async (id) => {
    const prev = get().entries;
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
    try {
      await apiDelete(`/journal/${id}`);
    } catch (err) {
      console.warn('[journalStore] deleteEntry failed:', err);
      set({ entries: prev });
    }
  },
    }),
    {
      name: 'sivena-journal',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
);
