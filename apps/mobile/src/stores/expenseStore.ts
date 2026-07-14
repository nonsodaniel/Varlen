import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { useHouseholdStore, getResolvedHouseholdId } from './householdStore';
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

// Map mobile category names to backend ExpenseCategory enum values
const CATEGORY_TO_BACKEND: Record<string, string> = {
  food: 'GROCERIES',
  groceries: 'GROCERIES',
  dining: 'DINING',
  transport: 'TRANSPORT',
  entertainment: 'ENTERTAINMENT',
  shopping: 'OTHER',
  bills: 'UTILITIES',
  utilities: 'UTILITIES',
  rent: 'RENT',
  health: 'HEALTH',
  other: 'OTHER',
};

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

let _lastFetchedAt = 0;

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set, get) => ({
  expenses: [],
  isLoading: false,

  fetchExpenses: async () => {
    const hasData = get().expenses.length > 0;
    if (hasData && Date.now() - _lastFetchedAt < 30000) return;
    set({ isLoading: !hasData });
    try {
      const { activeCircleId } = useCircleStore.getState();
      if (activeCircleId === null) {
        const res = await apiGet<{ data: { items: any[] } }>('/me/feed?type=expense');
        const items = res.data?.items ?? (res as any).items ?? [];
        _lastFetchedAt = Date.now();
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
        const hid = getResolvedHouseholdId();
        if (!hid) { set({ isLoading: false }); return; }
        const res = await apiGet<any>(`/households/${hid}/expenses`);
        const raw = res.data ?? res;
        const arr = Array.isArray(raw) ? raw : [];
        _lastFetchedAt = Date.now();
        set({ expenses: arr.map(mapExpense), isLoading: false });
      }
    } catch (err) {
      console.warn('[expenseStore] fetchExpenses failed:', err);
      set({ isLoading: false });
    }
  },

  addExpense: async (expense) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const tempId = `temp-${Date.now()}`;
    set((s) => ({ expenses: [...s.expenses, { ...expense, id: tempId }] }));
    try {
      const body: Record<string, unknown> = {
        title: expense.title,
        amount: expense.amount,
        currency: expense.currency,
        category: CATEGORY_TO_BACKEND[expense.category.toLowerCase()] ?? 'OTHER',
        date: expense.date || new Date().toISOString(),
      };
      if (expense.splitBetween?.length) {
        const splitAmount = expense.amount / expense.splitBetween.length;
        body.splits = expense.splitBetween.map((userId: string) => ({
          userId,
          amount: Math.round(splitAmount * 100) / 100,
        }));
      }
      const res = await apiPost<any>(`/households/${hid}/expenses`, body);
      const created = res?.data ?? res;
      if (created?.id) {
        set((s) => ({ expenses: s.expenses.map((e) => e.id === tempId ? mapExpense(created) : e) }));
      }
    } catch (err) {
      console.warn('[expenseStore] addExpense failed:', err);
    }
  },

  settleExpense: (id) => {
    const hid = getResolvedHouseholdId();
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
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().expenses;
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/expenses/${id}`);
    } catch (err) {
      console.warn('[expenseStore] deleteExpense failed:', err);
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
    }),
    {
      name: 'sivena-expenses',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ expenses: state.expenses }),
    },
  ),
);
