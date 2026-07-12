import { useMemo } from 'react';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { useTaskStore } from '../stores/taskStore';
import { useMealStore } from '../stores/mealStore';
import { useHabitStore } from '../stores/habitStore';
import { useSavingsStore } from '../stores/savingsStore';
import { useSettingsStore } from '../stores/settingsStore';

export interface Challenge {
  id: string;
  title: string;
  emoji: string;
  description: string;
  progress: number;
  target: number;
  unit: string;
  color: string;
  bg: string;
}

export function useChallenges(): Challenge[] {
  const tasks = useTaskStore((s) => s.tasks);
  const weekPlan = useMealStore((s) => s.weekPlan);
  const habits = useHabitStore((s) => s.habits);
  const goals = useSavingsStore((s) => s.goals);
  const cs = useSettingsStore((s) => s.currencySymbol) || '$';

  return useMemo(() => {
    const challenges: Challenge[] = [];
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // 1. Complete 5 tasks this week
    const completedThisWeek = tasks.filter((t) => {
      if (!t.completed) return false;
      // Use dueDate as a proxy if available, otherwise count all completed
      if (t.dueDate) {
        const d = new Date(t.dueDate);
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      }
      return false;
    }).length;
    // Always show this challenge if user has tasks
    if (tasks.length > 0) {
      challenges.push({
        id: 'weekly-tasks',
        title: 'Complete 5 tasks this week',
        emoji: '\u2705',
        description: 'Stay productive by knocking out your to-do list',
        progress: Math.min(completedThisWeek, 5),
        target: 5,
        unit: 'tasks',
        color: '#3B82F6',
        bg: '#EFF6FF',
      });
    }

    // 2. Log meals 3 days in a row
    if (weekPlan.length > 0) {
      let consecutiveDays = 0;
      for (let i = 0; i < 7; i++) {
        const d = format(new Date(now.getTime() - i * 86400000), 'yyyy-MM-dd');
        const plan = weekPlan.find((p) => p.date === d);
        if (plan && (plan.breakfast || plan.lunch || plan.dinner)) {
          consecutiveDays++;
        } else {
          break;
        }
      }
      challenges.push({
        id: 'meal-streak',
        title: 'Log meals 3 days in a row',
        emoji: '\uD83C\uDF7D\uFE0F',
        description: 'Plan at least one meal per day for 3 consecutive days',
        progress: Math.min(consecutiveDays, 3),
        target: 3,
        unit: 'days',
        color: '#F97316',
        bg: '#FFF7ED',
      });
    }

    // 3. Build a 7-day habit streak
    if (habits.length > 0) {
      const bestCurrentStreak = Math.max(...habits.map((h) => h.streak), 0);
      challenges.push({
        id: 'habit-7day',
        title: '7-day habit streak',
        emoji: '\uD83D\uDD25',
        description: 'Keep any habit going for a full week',
        progress: Math.min(bestCurrentStreak, 7),
        target: 7,
        unit: 'days',
        color: '#8B5CF6',
        bg: '#EDE9FE',
      });
    }

    // 4. Complete all habits today
    if (habits.length > 0) {
      const completedToday = habits.filter((h) =>
        h.completedDates.includes(todayStr),
      ).length;
      challenges.push({
        id: 'all-habits-today',
        title: 'Complete all habits today',
        emoji: '\uD83C\uDFC6',
        description: `Check off all ${habits.length} habits before the day ends`,
        progress: completedToday,
        target: habits.length,
        unit: 'habits',
        color: '#10B981',
        bg: '#D1FAE5',
      });
    }

    // 5. Save towards a goal
    const activeGoals = goals.filter(
      (g) => g.targetAmount > 0 && g.currentAmount < g.targetAmount,
    );
    if (activeGoals.length > 0) {
      const g = activeGoals[0];
      const pct = Math.round((g.currentAmount / g.targetAmount) * 100);
      challenges.push({
        id: 'savings-goal',
        title: `Fund "${g.title}"`,
        emoji: '\uD83D\uDCB0',
        description: `${cs}${Math.round(g.currentAmount).toLocaleString()} of ${cs}${Math.round(g.targetAmount).toLocaleString()} saved`,
        progress: Math.min(pct, 100),
        target: 100,
        unit: '%',
        color: '#06B6D4',
        bg: '#CFFAFE',
      });
    }

    return challenges;
  }, [tasks, weekPlan, habits, goals, cs]);
}
