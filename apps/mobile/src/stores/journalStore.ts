import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { JournalEntry } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';

interface JournalState {
  entries: JournalEntry[];
  isLoading: boolean;
  // Maps mode name → entry IDs created in that mode.
  // Used to filter server-returned entries to the current mode only.
  modeEntryIds: Record<string, string[]>;
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

function getCurrentMode(): string {
  // Lazy require to avoid circular dependency
  return (require('./modeStore').useModeStore as any).getState().mode as string;
}

let _lastFetchedAt = 0;

export const useJournalStore = create<JournalState>()(
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
      const res = await apiGet<any>('/journal');
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
      console.warn('[journalStore] addEntry failed:', err);
      set((s) => ({ entries: s.entries.filter((e) => e.id !== tempId) }));
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
      console.warn('[journalStore] deleteEntry failed:', err);
      set({ entries: prev });
    }
  },
    }),
    {
      name: 'sivena-journal',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ entries: state.entries, modeEntryIds: state.modeEntryIds }),
    },
  ),
);
