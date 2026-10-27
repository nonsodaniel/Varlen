import { create } from 'zustand';
import type { ActivityFeedItem } from '../types';
import { apiGet } from '../services/api';
import { getResolvedHouseholdId } from './householdStore';

interface ActivityState {
  items: ActivityFeedItem[];
  isLoading: boolean;
  fetchActivity: () => Promise<void>;
}

function mapItem(a: any): ActivityFeedItem {
  return {
    id: a.id,
    userId: a.userId ?? a.createdById ?? '',
    action: a.action ?? a.type ?? '',
    detail: a.detail ?? a.description ?? a.title ?? '',
    timestamp: a.timestamp ?? a.createdAt ?? '',
    icon: a.icon ?? 'pulse-outline',
    color: a.color ?? '#3B82F6',
  };
}

let _lastFetchedAt = 0;

export const useActivityStore = create<ActivityState>((set, get) => ({
  items: [],
  isLoading: false,

  fetchActivity: async () => {
    const hasData = get().items.length > 0;
    if (hasData && Date.now() - _lastFetchedAt < 30000) return;
    set({ isLoading: !hasData });
    try {
      const hid = getResolvedHouseholdId();
      if (!hid) {
        set({ items: [], isLoading: false });
        return;
      }
      // Household-scoped feed — never fall back to /me/feed which would
      // aggregate activities from all modes and break mode isolation.
      const res = await apiGet<any>(`/households/${hid}/feed?limit=50`);
      const raw = res.data ?? res;
      const items = raw?.items ?? (Array.isArray(raw) ? raw : []);
      _lastFetchedAt = Date.now();
      set({ items: items.map(mapItem), isLoading: false });
    } catch (err) {
      console.warn('[activityStore] fetchActivity failed:', err);
      set({ isLoading: false });
    }
  },
}));
