import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import type { Habit } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { getResolvedHouseholdId, ensureHouseholdId } from './householdStore';

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
    reminderTime: r.reminderTime ?? undefined,
    completedDates: r.completedDates ?? r.completions?.map((c: any) => c.date?.split('T')[0]) ?? [],
    createdBy: r.createdById ?? r.createdBy ?? '',
    color: r.color ?? '#3B82F6',
    streak: r.streak ?? 0,
    bestStreak: r.bestStreak ?? 0,
  };
}

let _lastFetchedAt = 0;

export const useHabitStore = create<HabitStoreState>()(
  persist(
    (set, get) => ({
  habits: [],
  isLoading: false,

  fetchHabits: async () => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const hasData = get().habits.length > 0;
    if (hasData && Date.now() - _lastFetchedAt < 30000) return;
    set({ isLoading: !hasData });
    try {
      const res = await apiGet<any>(`/households/${hid}/routines`);
      const raw = res.data ?? res;
      const arr = Array.isArray(raw) ? raw : [];
      _lastFetchedAt = Date.now();
      set({ habits: arr.map(mapHabit), isLoading: false });
    } catch (err) {
      console.warn('[habitStore] fetchHabits failed:', err);
      set({ isLoading: false });
    }
  },

  addHabit: async (habit) => {
    const hid = await ensureHouseholdId();
    if (!hid) return;
    const tempId = `temp-${Date.now()}`;
    set((s) => ({
      habits: [...s.habits, { ...habit, id: tempId, completedDates: [], streak: 0, bestStreak: 0 }],
    }));
    try {
      // Map extended frequencies to server-compatible values
      const serverFreq = ['daily', 'weekdays'].includes(habit.frequency) ? 'DAILY' : 'WEEKLY';
      const body: Record<string, unknown> = {
        title: habit.title,
        emoji: habit.emoji,
        frequency: serverFreq,
        color: habit.color,
        ...(habit.reminderTime && { reminderTime: habit.reminderTime }),
      };
      const res = await apiPost<any>(`/households/${hid}/routines`, body);
      const created = res?.data ?? res;
      if (created?.id) {
        set((s) => ({ habits: s.habits.map((h) => h.id === tempId ? mapHabit(created) : h) }));
      }
    } catch (err) {
      console.warn('[habitStore] addHabit failed:', err);
      set((s) => ({ habits: s.habits.filter((h) => h.id !== tempId) }));
    }
  },

  removeHabit: async (id) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().habits;
    set((s) => ({ habits: s.habits.filter((h) => h.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/routines/${id}`);
    } catch (err) {
      console.warn('[habitStore] removeHabit failed:', err);
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
