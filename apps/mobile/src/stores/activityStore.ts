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

export const useActivityStore = create<ActivityState>((set) => ({
  items: [],
  isLoading: false,

  fetchActivity: async () => {
    set({ isLoading: true });
    try {
      const hid = getResolvedHouseholdId();
      if (!hid) {
        set({ items: [], isLoading: false });
        return;
      }
      // Try household-scoped feed first; fall back to /me/feed if endpoint not available
      let raw: any = null;
      try {
        const res = await apiGet<any>(`/households/${hid}/feed?limit=50`);
        raw = res.data ?? res;
      } catch {
        const res = await apiGet<any>('/me/feed?limit=50');
        raw = res.data ?? res;
      }
      const items = raw?.items ?? (Array.isArray(raw) ? raw : []);
      set({ items: items.map(mapItem), isLoading: false });
    } catch (err) {
      console.warn('[activityStore] fetchActivity failed:', err);
      set({ isLoading: false });
    }
  },
}));
