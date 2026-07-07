import { create } from 'zustand';
import { Expense } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { useHouseholdStore } from './householdStore';
import { useAuthStore } from './authStore';
import { useCircleStore } from './circleStore';

interface ExpenseState {
  expenses: Expense[];
  isLoading: boolean;
  fetchExpenses: () => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  settleExpense: (id: string) => void;
  deleteExpense: (id: string) => Promise<void>;
  getBalance: () => { userOwes: number; partnerOwes: number; net: number };
}

function mapExpense(e: any): Expense {
  return {
    id: e.id,
    title: e.title ?? e.description ?? '',
    amount: typeof e.amount === 'string' ? parseFloat(e.amount) : e.amount,
    currency: e.currency ?? 'USD',
    paidBy: e.paidById ?? e.paidBy ?? '',
    splitBetween: e.splitBetween ?? e.splits?.map((s: any) => s.userId) ?? [],
    category: (e.category ?? 'other').toLowerCase() as Expense['category'],
    date: e.date ?? e.createdAt ?? '',
    settled: e.settled ?? e.status === 'SETTLED',
  };
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  isLoading: false,

  fetchExpenses: async () => {
    set({ isLoading: true });
    try {
      const { activeCircleId } = useCircleStore.getState();
      if (activeCircleId === null) {
        const res = await apiGet<{ data: { items: any[] } }>('/me/feed?type=expense');
        const items = res.data?.items ?? (res as any).items ?? [];
        set({ expenses: items.map((item: any) => ({
          id: item.id,
          title: item.title,
          amount: item.metadata?.amount ?? 0,
          currency: item.metadata?.currency ?? 'USD',
          paidBy: item.createdById ?? '',
          splitBetween: [],
          category: (item.metadata?.category ?? 'other').toLowerCase() as Expense['category'],
          date: item.date ?? '',
          settled: item.metadata?.settled ?? false,
        })), isLoading: false });
      } else {
        const hid = useHouseholdStore.getState().householdId;
        if (!hid) { set({ isLoading: false }); return; }
        const res = await apiGet<{ data: any[] }>(`/households/${hid}/expenses`);
        set({ expenses: (res.data ?? []).map(mapExpense), isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  addExpense: async (expense) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    try {
      const body: Record<string, unknown> = {
        title: expense.title,
        amount: expense.amount,
        currency: expense.currency,
        paidById: expense.paidBy,
        splitBetween: expense.splitBetween,
        category: expense.category.toUpperCase(),
        date: expense.date,
      };
      const res = await apiPost<{ data: any }>(`/households/${hid}/expenses`, body);
      const newExpense = res?.data ? mapExpense(res.data) : { ...expense, id: `temp-${Date.now()}` };
      set((s) => ({ expenses: [...s.expenses, newExpense] }));
    } catch {
      set((s) => ({ expenses: [...s.expenses, { ...expense, id: `temp-${Date.now()}` }] }));
    }
  },

  settleExpense: (id) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    set((s) => ({
      expenses: s.expenses.map((e) =>
        e.id === id ? { ...e, settled: true } : e,
      ),
    }));
    apiPatch(`/households/${hid}/expenses/${id}/settle`).catch(() => {
      set((s) => ({
        expenses: s.expenses.map((e) =>
          e.id === id ? { ...e, settled: false } : e,
        ),
      }));
    });
  },

  deleteExpense: async (id) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    const prev = get().expenses;
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/expenses/${id}`);
    } catch {
      set({ expenses: prev });
    }
  },

  getBalance: () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { userOwes: 0, partnerOwes: 0, net: 0 };

    const unsettled = get().expenses.filter((e) => !e.settled);
    let userPaid = 0;
    let partnerPaid = 0;

    unsettled.forEach((e) => {
      const splitCount = e.splitBetween.length || 1;
      const splitAmount = Math.round((e.amount / splitCount) * 100) / 100;
      if (e.paidBy === userId) {
        userPaid += e.amount - splitAmount;
      } else {
        partnerPaid += e.amount - splitAmount;
      }
    });

    return {
      userOwes: Math.round(partnerPaid * 100) / 100,
      partnerOwes: Math.round(userPaid * 100) / 100,
      net: Math.round((userPaid - partnerPaid) * 100) / 100,
    };
  },
}));
