import { create } from 'zustand';
import type { TimelineEntry } from '../types';
import { apiGet, apiPost, apiDelete } from '../services/api';
import { useHouseholdStore } from './householdStore';

interface TimelineState {
  entries: TimelineEntry[];
  isLoading: boolean;
  fetchTimeline: () => Promise<void>;
  addEntry: (entry: Omit<TimelineEntry, 'id'>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
}

function mapEntry(e: any): TimelineEntry {
  return {
    id: e.id,
    title: e.title ?? '',
    description: e.description ?? undefined,
    emoji: e.emoji ?? '',
    date: e.date ?? e.createdAt ?? '',
    category: (e.category ?? 'event').toLowerCase() as TimelineEntry['category'],
    createdBy: e.createdById ?? e.createdBy ?? '',
  };
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  entries: [],
  isLoading: false,

  fetchTimeline: async () => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    set({ isLoading: true });
    try {
      const res = await apiGet<any>(`/households/${hid}/timeline`);
      const raw = res.data ?? res;
      const arr = Array.isArray(raw) ? raw : [];
      set({ entries: arr.map(mapEntry), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addEntry: async (entry) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    try {
      const body: Record<string, unknown> = {
        title: entry.title,
        description: entry.description,
        emoji: entry.emoji,
        date: entry.date,
        category: entry.category.toUpperCase(),
      };
      const res = await apiPost<any>(`/households/${hid}/timeline`, body);
      const created = res?.data ?? res;
      const newEntry = created?.id ? mapEntry(created) : { ...entry, id: `temp-${Date.now()}` };
      set((s) => ({ entries: [newEntry, ...s.entries] }));
    } catch {
      set((s) => ({ entries: [{ ...entry, id: `temp-${Date.now()}` }, ...s.entries] }));
    }
  },

  deleteEntry: async (id) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    const prev = get().entries;
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/timeline/${id}`);
    } catch {
      set({ entries: prev });
    }
  },
}));
