import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Countdown } from '../types';
import { apiGet, apiPost, apiDelete } from '../services/api';
import { getResolvedHouseholdId, ensureHouseholdId } from './householdStore';

interface CountdownState {
  countdowns: Countdown[];
  isLoading: boolean;
  fetchCountdowns: () => Promise<void>;
  addCountdown: (countdown: Omit<Countdown, 'id'>) => Promise<void>;
  deleteCountdown: (id: string) => Promise<void>;
}

function mapCountdown(c: any): Countdown {
  return {
    id: c.id,
    title: c.title ?? '',
    date: c.date ?? '',
    emoji: c.emoji ?? '',
    color: c.color ?? '#6366F1',
  };
}

let _lastFetchedAt = 0;

export const useCountdownStore = create<CountdownState>()(
  persist(
    (set, get) => ({
  countdowns: [],
  isLoading: false,

  fetchCountdowns: async () => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const hasData = get().countdowns.length > 0;
    if (hasData && Date.now() - _lastFetchedAt < 30000) return;
    set({ isLoading: !hasData });
    try {
      const res = await apiGet<any>(`/households/${hid}/countdowns`);
      const raw = res.data ?? res;
      const arr = Array.isArray(raw) ? raw : [];
      _lastFetchedAt = Date.now();
      set({ countdowns: arr.map(mapCountdown), isLoading: false });
    } catch (err) {
      console.warn('[countdownStore] fetchCountdowns failed:', err);
      set({ isLoading: false });
    }
  },

  addCountdown: async (countdown) => {
    const hid = await ensureHouseholdId();
    if (!hid) return;
    const tempId = `temp-${Date.now()}`;
    set((s) => ({ countdowns: [...s.countdowns, { ...countdown, id: tempId }] }));
    try {
      const body: Record<string, unknown> = {
        title: countdown.title,
        date: countdown.date,
        emoji: countdown.emoji,
        color: countdown.color,
      };
      const res = await apiPost<any>(`/households/${hid}/countdowns`, body);
      const created = res?.data ?? res;
      if (created?.id) {
        set((s) => ({ countdowns: s.countdowns.map((c) => c.id === tempId ? mapCountdown(created) : c) }));
      }
    } catch (err) {
      console.warn('[countdownStore] addCountdown failed:', err);
      set((s) => ({ countdowns: s.countdowns.filter((c) => c.id !== tempId) }));
    }
  },

  deleteCountdown: async (id) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().countdowns;
    set((s) => ({ countdowns: s.countdowns.filter((c) => c.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/countdowns/${id}`);
    } catch (err) {
      console.warn('[countdownStore] deleteCountdown failed:', err);
      set({ countdowns: prev });
    }
  },
    }),
    {
      name: 'sivena-countdowns',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ countdowns: state.countdowns }),
    },
  ),
);
