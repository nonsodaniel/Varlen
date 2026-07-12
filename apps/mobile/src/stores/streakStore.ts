import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';

interface StreakState {
  currentStreak: number;
  bestStreak: number;
  lastCheckInDate: string | null;
  milestoneReached: number | null;
  checkIn: () => void;
  clearMilestone: () => void;
}

const MILESTONES = [7, 14, 21, 30, 50, 100];

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      bestStreak: 0,
      lastCheckInDate: null,
      milestoneReached: null,

      checkIn: () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const { lastCheckInDate, currentStreak, bestStreak } = get();

        if (lastCheckInDate === today) return;

        const yesterday = format(
          new Date(Date.now() - 86400000),
          'yyyy-MM-dd',
        );

        let newStreak: number;
        if (lastCheckInDate === yesterday) {
          newStreak = currentStreak + 1;
        } else {
          newStreak = 1;
        }

        const newBest = Math.max(bestStreak, newStreak);
        const milestone = MILESTONES.includes(newStreak) ? newStreak : null;

        set({
          currentStreak: newStreak,
          bestStreak: newBest,
          lastCheckInDate: today,
          milestoneReached: milestone,
        });
      },

      clearMilestone: () => set({ milestoneReached: null }),
    }),
    {
      name: 'sivena-streak',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentStreak: state.currentStreak,
        bestStreak: state.bestStreak,
        lastCheckInDate: state.lastCheckInDate,
      }),
    },
  ),
);
