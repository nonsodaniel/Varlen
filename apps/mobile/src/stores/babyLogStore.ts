import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BabyLog } from '../types';
import { apiGet, apiPost, apiDelete } from '../services/api';
import { getResolvedHouseholdId, useHouseholdStore } from './householdStore';
import { useAuthStore } from './authStore';

export const BABY_LOG_STORAGE_KEY = '@sivena_baby_logs';

function mapLog(l: any): BabyLog {
  return {
    id: l.id,
    childId: l.childId ?? l.child_id,
    type: l.type as BabyLog['type'],
    timestamp: l.timestamp ?? l.createdAt,
    duration: l.duration ?? undefined,
    note: l.note ?? l.notes ?? undefined,
  };
}

let _lastFetchedAt = 0;

interface BabyLogState {
  logs: BabyLog[];
  isLoaded: boolean;
  loadLogs: () => Promise<void>;
  addLog: (log: BabyLog) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
  getLatestByType: (childId: string, type: BabyLog['type']) => BabyLog | undefined;
  getTodayCount: (childId: string, type: BabyLog['type']) => number;
  getTodayLogs: (childId: string, type: BabyLog['type']) => BabyLog[];
  getMilestonesForChildren: (childIds: string[]) => BabyLog[];
}

export const useBabyLogStore = create<BabyLogState>((set, get) => ({
  logs: [],
  isLoaded: false,

  loadLogs: async () => {
    // Check hid FIRST — never read from AsyncStorage cache if no household for this mode
    const hid = getResolvedHouseholdId();
    if (!hid || !useAuthStore.getState().isAuthenticated) {
      set({ logs: [], isLoaded: true });
      return;
    }

    // Return early if data is fresh
    const hasData = get().logs.length > 0;
    if (hasData && Date.now() - _lastFetchedAt < 30000) return;

    // Show cached data immediately while API call is in flight
    if (!hasData) {
      try {
        const raw = await AsyncStorage.getItem(BABY_LOG_STORAGE_KEY);
        const cached: BabyLog[] = raw ? JSON.parse(raw) : [];
        if (Array.isArray(cached) && cached.length > 0) {
          set({ logs: cached, isLoaded: true });
        }
      } catch {}
    }

    // Fetch from backend (gracefully falls back to local cache on failure)
    try {
      const children = useHouseholdStore.getState().household?.children ?? [];
      const allLogs: BabyLog[] = [];
      await Promise.all(
        children.map(async (child) => {
          try {
            const res = await apiGet<any>(`/households/${hid}/children/${child.id}/logs?limit=200`);
            const raw = res.data ?? res;
            const items = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
            items.forEach((l: any) => allLogs.push(mapLog({ ...l, childId: child.id })));
          } catch { /* skip child on failure */ }
        }),
      );
      const arr: BabyLog[] = allLogs;
      _lastFetchedAt = Date.now();
      set({ logs: arr, isLoaded: true });
      // Keep local cache in sync
      AsyncStorage.setItem(BABY_LOG_STORAGE_KEY, JSON.stringify(arr)).catch(() => {});
    } catch {
      // API unavailable or endpoint doesn't exist yet — keep local cache
      set({ isLoaded: true });
    }
  },

  addLog: async (log: BabyLog) => {
    // Optimistic update — UI is instant
    const optimistic = [log, ...get().logs];
    set({ logs: optimistic });
    AsyncStorage.setItem(BABY_LOG_STORAGE_KEY, JSON.stringify(optimistic)).catch(() => {});

    try {
      const hid = getResolvedHouseholdId();
      if (!hid || !useAuthStore.getState().isAuthenticated) return;
      const res = await apiPost<any>(`/households/${hid}/children/${log.childId}/logs`, {
        type: log.type,
        timestamp: log.timestamp,
        ...(log.duration != null && { duration: log.duration }),
        ...(log.note && { note: log.note }),
      });
      // Replace optimistic entry with server-assigned record
      const saved = mapLog(res.data ?? res);
      const updated = get().logs.map((l) => (l.id === log.id ? saved : l));
      set({ logs: updated });
      AsyncStorage.setItem(BABY_LOG_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    } catch {
      // Offline queue handles retry — optimistic state persists
    }
  },

  deleteLog: async (id: string) => {
    // Capture log BEFORE filtering — needed for API call
    const log = get().logs.find((l) => l.id === id);
    if (!log) return;

    // Optimistic delete
    const updated = get().logs.filter((l) => l.id !== id);
    set({ logs: updated });
    AsyncStorage.setItem(BABY_LOG_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});

    try {
      const hid = getResolvedHouseholdId();
      if (!hid || !useAuthStore.getState().isAuthenticated) return;
      await apiDelete(`/households/${hid}/children/${log.childId}/logs/${id}`);
    } catch {
      // Keep deletion in local state — offline queue handles retry
    }
  },

  getLatestByType: (childId: string, type: BabyLog['type']) =>
    get()
      .logs.filter((l) => l.childId === childId && l.type === type && !!l.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0],

  getTodayCount: (childId: string, type: BabyLog['type']) => {
    const today = new Date().toISOString().split('T')[0];
    return get().logs.filter(
      (l) => l.childId === childId && l.type === type && l.timestamp?.startsWith(today),
    ).length;
  },

  getTodayLogs: (childId: string, type: BabyLog['type']) => {
    const today = new Date().toISOString().split('T')[0];
    return get()
      .logs.filter(
        (l) => l.childId === childId && l.type === type && l.timestamp?.startsWith(today),
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  getMilestonesForChildren: (childIds: string[]) =>
    get()
      .logs.filter((l) => l.type === 'milestone' && childIds.includes(l.childId) && !!l.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10),
}));
