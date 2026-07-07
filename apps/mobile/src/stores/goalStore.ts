import { create } from 'zustand';
import type { Goal } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { useHouseholdStore } from './householdStore';
import { useCircleStore } from './circleStore';

interface GoalState {
  goals: Goal[];
  isLoading: boolean;
  fetchGoals: () => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
  updateProgress: (id: string, increment: number) => void;
  deleteGoal: (id: string) => Promise<void>;
}

function mapGoal(g: any): Goal {
  return {
    id: g.id,
    title: g.title ?? '',
    progress: g.progress ?? 0,
    target: g.target ?? 100,
    unit: g.unit ?? '',
    deadline: g.deadline ?? g.targetDate ?? '',
    color: g.color ?? '#3B82F6',
    createdBy: g.createdById ?? g.createdBy ?? '',
  };
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  isLoading: false,

  fetchGoals: async () => {
    set({ isLoading: true });
    try {
      const { activeCircleId } = useCircleStore.getState();
      if (activeCircleId === null) {
        const res = await apiGet<{ data: { items: any[] } }>('/me/feed?type=goal');
        const items = res.data?.items ?? (res as any).items ?? [];
        set({ goals: items.map((item: any) => ({
          id: item.id,
          title: item.title,
          progress: item.metadata?.progress ?? 0,
          target: item.metadata?.target ?? 100,
          unit: item.metadata?.unit ?? '',
          deadline: item.metadata?.deadline ?? '',
          color: item.metadata?.color ?? '#3B82F6',
          createdBy: item.createdById ?? '',
        })), isLoading: false });
      } else {
        const hid = useHouseholdStore.getState().householdId;
        if (!hid) { set({ isLoading: false }); return; }
        const res = await apiGet<{ data: any[] }>(`/households/${hid}/goals`);
        set({ goals: (res.data ?? []).map(mapGoal), isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  addGoal: async (goal) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    try {
      const body: Record<string, unknown> = {
        title: goal.title,
        progress: goal.progress ?? 0,
        target: goal.target,
        unit: goal.unit,
        deadline: goal.deadline,
        color: goal.color,
      };
      const res = await apiPost<{ data: any }>(`/households/${hid}/goals`, body);
      const newGoal = res?.data ? mapGoal(res.data) : { ...goal, id: `temp-${Date.now()}` };
      set((s) => ({ goals: [...s.goals, newGoal] }));
    } catch {
      set((s) => ({ goals: [...s.goals, { ...goal, id: `temp-${Date.now()}` }] }));
    }
  },

  updateProgress: (id, increment) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    const prev = get().goals;
    let newProgress = 0;
    set((s) => ({
      goals: s.goals.map((g) => {
        if (g.id === id) {
          newProgress = Math.min(100, g.progress + increment);
          return { ...g, progress: newProgress };
        }
        return g;
      }),
    }));

    apiPatch(`/households/${hid}/goals/${id}`, { progress: newProgress }).catch(() => {
      set({ goals: prev });
    });
  },

  deleteGoal: async (id) => {
    const hid = useHouseholdStore.getState().householdId;
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
