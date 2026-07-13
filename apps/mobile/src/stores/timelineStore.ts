import { create } from 'zustand';
import type { TimelineEntry } from '../types';
import { apiGet, apiPost, apiDelete } from '../services/api';
import { useHouseholdStore, getResolvedHouseholdId } from './householdStore';

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
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    set({ isLoading: true });
    try {
      const res = await apiGet<any>(`/households/${hid}/timeline`);
      const raw = res.data ?? res;
      const arr = Array.isArray(raw) ? raw : [];
      set({ entries: arr.map(mapEntry), isLoading: false });
    } catch (err) {
      console.warn('[timelineStore] fetchTimeline failed:', err);
      set({ isLoading: false });
    }
  },

  addEntry: async (entry) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const tempId = `temp-${Date.now()}`;
    set((s) => ({ entries: [{ ...entry, id: tempId }, ...s.entries] }));
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
      if (created?.id) {
        set((s) => ({ entries: s.entries.map((e) => e.id === tempId ? mapEntry(created) : e) }));
      }
    } catch (err) {
      console.warn('[timelineStore] addEntry failed:', err);
    }
  },

  deleteEntry: async (id) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().entries;
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/timeline/${id}`);
    } catch (err) {
      console.warn('[timelineStore] deleteEntry failed:', err);
      set({ entries: prev });
    }
  },
}));
