import { create } from 'zustand';
import type { Subscription } from '../types';
import { apiGet, apiPost, apiDelete } from '../services/api';
import { useHouseholdStore } from './householdStore';

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

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptions: [],
  isLoading: false,

  fetchSubscriptions: async () => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    set({ isLoading: true });
    try {
      const res = await apiGet<{ data: any[] }>(`/households/${hid}/subscriptions`);
      set({ subscriptions: (res.data ?? []).map(mapSubscription), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addSubscription: async (sub) => {
    const hid = useHouseholdStore.getState().householdId;
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
      const res = await apiPost<{ data: any }>(`/households/${hid}/subscriptions`, body);
      if (res?.data) {
        set((s) => ({ subscriptions: s.subscriptions.map((x) => x.id === temp.id ? mapSubscription(res.data) : x) }));
      }
    } catch {
      set({ subscriptions: prev });
    }
  },

  deleteSubscription: async (id) => {
    const hid = useHouseholdStore.getState().householdId;
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
}));
