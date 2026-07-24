import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BabyLog } from '../types';

export const BABY_LOG_STORAGE_KEY = '@sivena_baby_logs';

interface BabyLogState {
  logs: BabyLog[];
  isLoaded: boolean;
  loadLogs: () => Promise<void>;
  addLog: (log: BabyLog) => Promise<void>;
  getLatestByType: (childId: string, type: BabyLog['type']) => BabyLog | undefined;
  getTodayCount: (childId: string, type: BabyLog['type']) => number;
  getTodayLogs: (childId: string, type: BabyLog['type']) => BabyLog[];
  getMilestonesForChildren: (childIds: string[]) => BabyLog[];
}

export const useBabyLogStore = create<BabyLogState>((set, get) => ({
  logs: [],
  isLoaded: false,

  loadLogs: async () => {
    try {
      const raw = await AsyncStorage.getItem(BABY_LOG_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const logs: BabyLog[] = Array.isArray(parsed) ? parsed : [];
      set({ logs, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  addLog: async (log: BabyLog) => {
    const updated = [log, ...get().logs];
    set({ logs: updated });
    try {
      await AsyncStorage.setItem(BABY_LOG_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  },

  getLatestByType: (childId: string, type: BabyLog['type']) =>
    get()
      .logs.filter((l) => l.childId === childId && l.type === type)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0],

  getTodayCount: (childId: string, type: BabyLog['type']) => {
    const today = new Date().toISOString().split('T')[0];
    return get().logs.filter(
      (l) => l.childId === childId && l.type === type && l.timestamp.startsWith(today),
    ).length;
  },

  getTodayLogs: (childId: string, type: BabyLog['type']) => {
    const today = new Date().toISOString().split('T')[0];
    return get()
      .logs.filter(
        (l) => l.childId === childId && l.type === type && l.timestamp.startsWith(today),
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  getMilestonesForChildren: (childIds: string[]) =>
    get()
      .logs.filter((l) => l.type === 'milestone' && childIds.includes(l.childId))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10),
}));
