import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Subscription } from '../types';
import { apiGet, apiPost, apiDelete } from '../services/api';
import { useHouseholdStore, getResolvedHouseholdId } from './householdStore';

interface SubscriptionState {
  subscriptions: Subscription[];
  isLoading: boolean;
  fetchSubscriptions: () => Promise<void>;
  addSubscription: (sub: Omit<Subscription, 'id'>) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  getMonthlyTotal: () => number;
}

function mapSubscription(s: any): Subscription {
  return {
    id: s.id,
    name: s.name ?? s.title ?? '',
    amount: typeof s.amount === 'string' ? parseFloat(s.amount) : (s.amount ?? 0),
    currency: s.currency ?? 'USD',
    cycle: (s.cycle ?? s.period ?? 'monthly').toLowerCase() as Subscription['cycle'],
    category: (s.category ?? 'other').toLowerCase() as Subscription['category'],
    nextBillingDate: s.nextBillingDate ?? s.nextDate ?? '',
    shared: s.shared ?? false,
  };
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
  subscriptions: [],
  isLoading: false,

  fetchSubscriptions: async () => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    set({ isLoading: true });
    try {
      const res = await apiGet<any>(`/households/${hid}/subscriptions`);
      const raw = res.data ?? res;
      const arr = Array.isArray(raw) ? raw : [];
      set({ subscriptions: arr.map(mapSubscription), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addSubscription: async (sub) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().subscriptions;
    const temp: Subscription = { ...sub, id: `temp-${Date.now()}` };
    set((s) => ({ subscriptions: [...s.subscriptions, temp] }));
    try {
      const body: Record<string, unknown> = {
        name: sub.name,
        amount: sub.amount,
        currency: sub.currency,
        cycle: sub.cycle.toUpperCase(),
        category: sub.category.toUpperCase(),
        nextBillingDate: sub.nextBillingDate,
        shared: sub.shared,
      };
      const res = await apiPost<any>(`/households/${hid}/subscriptions`, body);
      const created = res?.data ?? res;
      if (created?.id) {
        set((s) => ({ subscriptions: s.subscriptions.map((x) => x.id === temp.id ? mapSubscription(created) : x) }));
      }
    } catch {
      set({ subscriptions: prev });
    }
  },

  deleteSubscription: async (id) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().subscriptions;
    set((s) => ({ subscriptions: s.subscriptions.filter((x) => x.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/subscriptions/${id}`);
    } catch {
      set({ subscriptions: prev });
    }
  },

  getMonthlyTotal: () => {
    return get().subscriptions.reduce((total, sub) => {
      if (sub.cycle === 'yearly') return total + sub.amount / 12;
      return total + sub.amount;
    }, 0);
  },
    }),
    {
      name: 'sivena-subs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ subscriptions: state.subscriptions }),
    },
  ),
);
