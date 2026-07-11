import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Countdown } from '../types';
import { apiGet, apiPost, apiDelete } from '../services/api';
import { useHouseholdStore, getResolvedHouseholdId } from './householdStore';

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

export const useCountdownStore = create<CountdownState>()(
  persist(
    (set, get) => ({
  countdowns: [],
  isLoading: false,

  fetchCountdowns: async () => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    set({ isLoading: true });
    try {
      const res = await apiGet<any>(`/households/${hid}/countdowns`);
      const raw = res.data ?? res;
      const arr = Array.isArray(raw) ? raw : [];
      set({ countdowns: arr.map(mapCountdown), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addCountdown: async (countdown) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    try {
      const body: Record<string, unknown> = {
        title: countdown.title,
        date: countdown.date,
        emoji: countdown.emoji,
        color: countdown.color,
      };
      const res = await apiPost<any>(`/households/${hid}/countdowns`, body);
      set((s) => ({ countdowns: [...s.countdowns, mapCountdown(res.data ?? res)] }));
    } catch {}
  },

  deleteCountdown: async (id) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().countdowns;
    set((s) => ({ countdowns: s.countdowns.filter((c) => c.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/countdowns/${id}`);
    } catch {
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
