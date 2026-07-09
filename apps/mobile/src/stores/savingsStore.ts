import { create } from 'zustand';
import type { SavingsGoal } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { useHouseholdStore, getResolvedHouseholdId } from './householdStore';

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
  const raw = g.data ?? g;
  return {
    id: raw.id,
    title: raw.title ?? '',
    targetAmount: typeof raw.target === 'string' ? parseFloat(raw.target) : (raw.target ?? raw.targetAmount ?? 0),
    currentAmount: typeof raw.progress === 'string' ? parseFloat(raw.progress) : (raw.progress ?? raw.currentAmount ?? 0),
    deadline: raw.deadline ?? undefined,
    color: raw.color ?? '#3B82F6',
    shared: raw.shared ?? false,
  };
}

export const useSavingsStore = create<SavingsState>((set, get) => ({
  goals: [],
  isLoading: false,

  fetchGoals: async () => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    set({ isLoading: true });
    try {
      const res = await apiGet<any>(`/households/${hid}/goals`);
      const raw = res.data ?? res;
      const arr = Array.isArray(raw) ? raw : [];
      set({ goals: arr.map(mapGoal), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addGoal: async (goal) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().goals;
    const tempGoal: SavingsGoal = { ...goal, id: `temp-${Date.now()}` };
    set((s) => ({ goals: [...s.goals, tempGoal] }));
    try {
      const res = await apiPost<any>(`/households/${hid}/goals`, {
        title: goal.title,
        target: goal.targetAmount,
        unit: 'dollars',
        deadline: goal.deadline ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        color: goal.color ?? '#3B82F6',
      });
      const created = mapGoal(res);
      set((s) => ({ goals: s.goals.map((g) => g.id === tempGoal.id ? created : g) }));
    } catch {
      set({ goals: prev });
    }
  },

  addContribution: async (goalId, amount) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const goal = get().goals.find((g) => g.id === goalId);
    if (!goal) return;
    const newAmount = goal.currentAmount + amount;
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === goalId ? { ...g, currentAmount: newAmount } : g
      ),
    }));
    try {
      await apiPatch(`/households/${hid}/goals/${goalId}`, { progress: newAmount });
    } catch {
      set((s) => ({
        goals: s.goals.map((g) =>
          g.id === goalId ? { ...g, currentAmount: goal.currentAmount } : g
        ),
      }));
    }
  },

  updateGoal: async (id, updates) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().goals;
    set((s) => ({ goals: s.goals.map((g) => g.id === id ? { ...g, ...updates } : g) }));
    try {
      const body: Record<string, unknown> = {};
      if (updates.title !== undefined) body.title = updates.title;
      if (updates.targetAmount !== undefined) body.target = updates.targetAmount;
      if (updates.currentAmount !== undefined) body.progress = updates.currentAmount;
      if (updates.deadline !== undefined) body.deadline = updates.deadline;
      if (updates.color !== undefined) body.color = updates.color;
      await apiPatch(`/households/${hid}/goals/${id}`, body);
    } catch {
      set({ goals: prev });
    }
  },

  deleteGoal: async (id) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().goals;
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/goals/${id}`);
    } catch {
      set({ goals: prev });
    }
  },
}));
