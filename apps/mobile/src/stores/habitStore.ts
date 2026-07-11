import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import type { Habit } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { useHouseholdStore, getResolvedHouseholdId } from './householdStore';

interface HabitStoreState {
  habits: Habit[];
  isLoading: boolean;
  fetchHabits: () => Promise<void>;
  addHabit: (habit: Omit<Habit, 'id' | 'completedDates' | 'streak' | 'bestStreak'>) => Promise<void>;
  removeHabit: (id: string) => Promise<void>;
  toggleToday: (id: string) => void;
  isCompletedToday: (id: string) => boolean;
}

function mapHabit(r: any): Habit {
  return {
    id: r.id,
    title: r.title ?? r.name ?? '',
    emoji: r.emoji ?? r.icon ?? '',
    frequency: (r.frequency ?? 'daily').toLowerCase() as Habit['frequency'],
    completedDates: r.completedDates ?? r.completions?.map((c: any) => c.date?.split('T')[0]) ?? [],
    createdBy: r.createdById ?? r.createdBy ?? '',
    color: r.color ?? '#3B82F6',
    streak: r.streak ?? 0,
    bestStreak: r.bestStreak ?? 0,
  };
}

export const useHabitStore = create<HabitStoreState>()(
  persist(
    (set, get) => ({
  habits: [],
  isLoading: false,

  fetchHabits: async () => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    set({ isLoading: true });
    try {
      const res = await apiGet<any>(`/households/${hid}/routines`);
      const raw = res.data ?? res;
      const arr = Array.isArray(raw) ? raw : [];
      set({ habits: arr.map(mapHabit), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addHabit: async (habit) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    try {
      const body: Record<string, unknown> = {
        title: habit.title,
        emoji: habit.emoji,
        frequency: habit.frequency.toUpperCase(),
        color: habit.color,
      };
      const res = await apiPost<any>(`/households/${hid}/routines`, body);
      const created = res?.data ?? res;
      const newHabit = created?.id
        ? mapHabit(created)
        : { ...habit, id: `temp-${Date.now()}`, completedDates: [], streak: 0, bestStreak: 0 };
      set((s) => ({
        habits: [...s.habits, newHabit],
      }));
    } catch {
      // Offline fallback
      set((s) => ({
        habits: [...s.habits, { ...habit, id: `temp-${Date.now()}`, completedDates: [], streak: 0, bestStreak: 0 }],
      }));
    }
  },

  removeHabit: async (id) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().habits;
    set((s) => ({ habits: s.habits.filter((h) => h.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/routines/${id}`);
    } catch {
      set({ habits: prev });
    }
  },

  toggleToday: (id) => {
    const hid = getResolvedHouseholdId();
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    // Prevent double-tap
    const habit = get().habits.find((h) => h.id === id);
    if (!habit || (habit as any)._toggling) return;

    const prev = get().habits;
    set((s) => ({
      habits: s.habits.map((h) => {
        if (h.id !== id) return h;
        const isCompleted = h.completedDates.includes(todayStr);
        const newDates = isCompleted
          ? h.completedDates.filter((d) => d !== todayStr)
          : [...h.completedDates, todayStr];
        const newStreak = isCompleted ? Math.max(0, h.streak - 1) : h.streak + 1;
        return {
          ...h,
          completedDates: newDates,
          streak: newStreak,
          bestStreak: Math.max(h.bestStreak, newStreak),
          _toggling: true,
        } as any;
      }),
    }));

    if (hid) {
      apiPatch(`/households/${hid}/routines/${id}/toggle`)
        .catch(() => {
          set({ habits: prev });
        })
        .finally(() => {
          set((s) => ({
            habits: s.habits.map((h) =>
              h.id === id ? { ...h, _toggling: undefined } : h,
            ),
          }));
        });
    }
  },

  isCompletedToday: (id) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const habit = get().habits.find((h) => h.id === id);
    return habit?.completedDates.includes(todayStr) ?? false;
  },
    }),
    {
      name: 'sivena-habits',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ habits: state.habits }),
    },
  ),
);
