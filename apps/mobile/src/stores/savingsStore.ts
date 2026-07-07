import { create } from 'zustand';
import type { SavingsGoal } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { useHouseholdStore } from './householdStore';

interface SavingsState {
  goals: SavingsGoal[];
  isLoading: boolean;
  fetchGoals: () => Promise<void>;
  addGoal: (goal: Omit<SavingsGoal, 'id'>) => Promise<void>;
  addContribution: (goalId: string, amount: number) => Promise<void>;
  updateGoal: (id: string, updates: Partial<SavingsGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

function mapGoal(g: any): SavingsGoal {
  return {
    id: g.id,
    title: g.title ?? '',
    targetAmount: typeof g.targetAmount === 'string' ? parseFloat(g.targetAmount) : (g.targetAmount ?? 0),
    currentAmount: typeof g.currentAmount === 'string' ? parseFloat(g.currentAmount) : (g.currentAmount ?? 0),
    deadline: g.deadline ?? undefined,
    color: g.color ?? '#3B82F6',
    shared: g.shared ?? false,
  };
}

export const useSavingsStore = create<SavingsState>((set, get) => ({
  goals: [],
  isLoading: false,

  fetchGoals: async () => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    set({ isLoading: true });
    try {
      const res = await apiGet<{ data: any[] }>(`/households/${hid}/savings`);
      set({ goals: (res.data ?? []).map(mapGoal), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addGoal: async (goal) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    const prev = get().goals;
    const tempGoal: SavingsGoal = { ...goal, id: `temp-${Date.now()}` };
    set((s) => ({ goals: [...s.goals, tempGoal] }));
    try {
      const res = await apiPost<{ data: any }>(`/households/${hid}/savings`, goal as Record<string, unknown>);
      if (res?.data) {
        set((s) => ({ goals: s.goals.map((g) => g.id === tempGoal.id ? mapGoal(res.data) : g) }));
      }
    } catch {
      set({ goals: prev });
    }
  },

  addContribution: async (goalId, amount) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g
      ),
    }));
    try {
      await apiPost(`/households/${hid}/savings/${goalId}/contribute`, { amount });
    } catch {
      set((s) => ({
        goals: s.goals.map((g) =>
          g.id === goalId ? { ...g, currentAmount: g.currentAmount - amount } : g
        ),
      }));
    }
  },

  updateGoal: async (id, updates) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    const prev = get().goals;
    set((s) => ({ goals: s.goals.map((g) => g.id === id ? { ...g, ...updates } : g) }));
    try {
      await apiPatch(`/households/${hid}/savings/${id}`, updates as Record<string, unknown>);
    } catch {
      set({ goals: prev });
    }
  },

  deleteGoal: async (id) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    const prev = get().goals;
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/savings/${id}`);
    } catch {
      set({ goals: prev });
    }
  },
}));
