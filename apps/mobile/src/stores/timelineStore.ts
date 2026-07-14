import { create } from 'zustand';
import type { TimelineEntry } from '../types';
import { apiGet, apiPost, apiDelete } from '../services/api';
import { useHouseholdStore, getResolvedHouseholdId } from './householdStore';
import { useAuthStore } from './authStore';

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

let _lastFetchedAt = 0;

export const useTimelineStore = create<TimelineState>((set, get) => ({
  entries: [],
  isLoading: false,

  fetchTimeline: async () => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const hasData = get().entries.length > 0;
    if (hasData && Date.now() - _lastFetchedAt < 30000) return;
    set({ isLoading: !hasData });
    try {
      const res = await apiGet<any>(`/households/${hid}/timeline`);
      const raw = res.data ?? res;
      const arr = Array.isArray(raw) ? raw : [];
      _lastFetchedAt = Date.now();
      set({ entries: arr.map(mapEntry), isLoading: false });
    } catch (err) {
      console.warn('[timelineStore] fetchTimeline failed:', err);
      set({ isLoading: false });
    }
  },

  addEntry: async (entry) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const currentUserId = useAuthStore.getState().user?.id ?? '';
    const tempId = `temp-${Date.now()}`;
    set((s) => ({ entries: [{ ...entry, id: tempId, createdBy: entry.createdBy || currentUserId }, ...s.entries] }));
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
