import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Goal } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { getResolvedHouseholdId, ensureHouseholdId } from './householdStore';
import { useCircleStore } from './circleStore';
import { useAuthStore } from './authStore';

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

let _lastFetchedAt = 0;

export const useGoalStore = create<GoalState>()(
  persist(
    (set, get) => ({
  goals: [],
  isLoading: false,

  fetchGoals: async () => {
    const hasData = get().goals.length > 0;
    if (hasData && Date.now() - _lastFetchedAt < 30000) return;
    set({ isLoading: !hasData });
    try {
      const hid = getResolvedHouseholdId();
      if (!hid) {
        // No household for this mode — show empty, never fall to /me/feed
        set({ goals: [], isLoading: false });
        return;
      }
      const res = await apiGet<any>(`/households/${hid}/goals`);
      const raw = res.data ?? res;
      const arr = Array.isArray(raw) ? raw : [];
      _lastFetchedAt = Date.now();
      set({ goals: arr.map(mapGoal), isLoading: false });
    } catch (err) {
      console.warn('[goalStore] fetchGoals failed:', err);
      set({ isLoading: false });
    }
  },

  addGoal: async (goal) => {
    const hid = await ensureHouseholdId();
    if (!hid) return;
    const currentUserId = useAuthStore.getState().user?.id ?? '';
    const tempId = `temp-${Date.now()}`;
    set((s) => ({ goals: [...s.goals, { ...goal, id: tempId, createdBy: goal.createdBy || currentUserId }] }));
    try {
      const body: Record<string, unknown> = {
        title: goal.title,
        target: goal.target,
        unit: goal.unit,
        deadline: goal.deadline,
        color: goal.color,
      };
      const res = await apiPost<any>(`/households/${hid}/goals`, body);
      const created = res?.data ?? res;
      if (created?.id) {
        set((s) => ({ goals: s.goals.map((g) => g.id === tempId ? mapGoal(created) : g) }));
      }
    } catch (err) {
      console.warn('[goalStore] addGoal failed:', err);
    }
  },

  updateProgress: (id, increment) => {
    const hid = getResolvedHouseholdId();
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
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().goals;
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/goals/${id}`);
    } catch (err) {
      console.warn('[goalStore] deleteGoal failed:', err);
      set({ goals: prev });
    }
  },
    }),
    {
      name: 'sivena-goals',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ goals: state.goals }),
    },
  ),
);
