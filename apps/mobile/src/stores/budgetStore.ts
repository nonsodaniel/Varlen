import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Budget } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { useHouseholdStore, getResolvedHouseholdId } from './householdStore';

interface BudgetState {
  budgets: Budget[];
  isLoading: boolean;
  fetchBudgets: () => Promise<void>;
  addBudget: (budget: Omit<Budget, 'id'>) => Promise<void>;
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
}

function mapBudget(b: any): Budget {
  return {
    id: b.id,
    category: (b.category ?? 'other').toLowerCase() as Budget['category'],
    limit: typeof b.limit === 'string' ? parseFloat(b.limit) : (b.limit ?? 0),
    spent: typeof b.spent === 'string' ? parseFloat(b.spent) : (b.spent ?? 0),
    period: 'monthly',
  };
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
  budgets: [],
  isLoading: false,

  fetchBudgets: async () => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    set({ isLoading: true });
    try {
      const res = await apiGet<any>(`/households/${hid}/budgets`);
      const raw = res.data ?? res;
      const arr = Array.isArray(raw) ? raw : [];
      set({ budgets: arr.map(mapBudget), isLoading: false });
    } catch (err) {
      console.warn('[budgetStore] fetchBudgets failed:', err);
      set({ isLoading: false });
    }
  },

  addBudget: async (budget) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const temp: Budget = { ...budget, id: `temp-${Date.now()}` };
    set((s) => ({ budgets: [...s.budgets, temp] }));
    try {
      const body: Record<string, unknown> = {
        category: budget.category.toUpperCase(),
        limit: budget.limit,
        period: 'MONTHLY',
      };
      const res = await apiPost<any>(`/households/${hid}/budgets`, body);
      const created = res?.data ?? res;
      if (created?.id) {
        set((s) => ({ budgets: s.budgets.map((b) => b.id === temp.id ? mapBudget(created) : b) }));
      }
    } catch (err) {
      console.warn('[budgetStore] addBudget failed:', err);
      set((s) => ({ budgets: s.budgets.filter((b) => b.id !== temp.id) }));
    }
  },

  updateBudget: async (id, updates) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().budgets;
    set((s) => ({
      budgets: s.budgets.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
    try {
      await apiPatch(`/households/${hid}/budgets/${id}`, updates as Record<string, unknown>);
    } catch (err) {
      console.warn('[budgetStore] updateBudget failed:', err);
      set({ budgets: prev });
    }
  },

  deleteBudget: async (id) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().budgets;
    set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/budgets/${id}`);
    } catch (err) {
      console.warn('[budgetStore] deleteBudget failed:', err);
      set({ budgets: prev });
    }
  },
    }),
    {
      name: 'sivena-budgets',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ budgets: state.budgets }),
    },
  ),
);
