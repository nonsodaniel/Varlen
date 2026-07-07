import { create } from 'zustand';
import type { ActivityFeedItem } from '../types';
import { apiGet } from '../services/api';
import { useHouseholdStore } from './householdStore';

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
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    set({ isLoading: true });
    try {
      const res = await apiGet<{ data: any[] }>(`/households/${hid}/activity`);
      set({ items: (res.data ?? []).map(mapItem), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
