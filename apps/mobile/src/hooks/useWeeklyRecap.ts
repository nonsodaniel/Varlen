import { useMemo } from 'react';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { useTaskStore } from '../stores/taskStore';
import { useExpenseStore } from '../stores/expenseStore';
import { useHabitStore } from '../stores/habitStore';
import { useMealStore } from '../stores/mealStore';
import { useCalendarStore } from '../stores/calendarStore';
import { useWellnessStore } from '../stores/wellnessStore';
import { useSavingsStore } from '../stores/savingsStore';
import { useStreakStore } from '../stores/streakStore';
import { useSettingsStore } from '../stores/settingsStore';

export interface WeeklyRecapData {
  weekLabel: string;
  tasksCompleted: number;
  totalTasks: number;
  expensesTotal: number;
  habitsCompletionRate: number;
  mealsPlanCount: number;
  eventsCount: number;
  wellnessAvgMood: number;
  wellnessEntryCount: number;
  savingsDeposited: number;
  streakDays: number;
  topCategory: string | null;
  currencySymbol: string;
  highlights: string[];
}

export function useWeeklyRecap(): WeeklyRecapData {
  const tasks = useTaskStore((s) => s.tasks);
  const expenses = useExpenseStore((s) => s.expenses);
  const habits = useHabitStore((s) => s.habits);
  const weekPlan = useMealStore((s) => s.weekPlan);
  const events = useCalendarStore((s) => s.events);
  const wellnessEntries = useWellnessStore((s) => s.entries);
  const goals = useSavingsStore((s) => s.goals);
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const cs = useSettingsStore((s) => s.currencySymbol) || '$';

  return useMemo(() => {
    const now = new Date();
    const weekAgo = subDays(now, 7);
    const weekStart = startOfDay(weekAgo);
    const weekEnd = endOfDay(now);
    const weekLabel = `${format(weekAgo, 'MMM d')} \u2013 ${format(now, 'MMM d')}`;

    // Tasks completed this week (use dueDate as proxy)
    const tasksCompleted = tasks.filter((t) => {
      if (!t.completed) return false;
      if (t.dueDate) {
        return isWithinInterval(new Date(t.dueDate), { start: weekStart, end: weekEnd });
      }
      return false;
    }).length;

    // Expenses total this week
    const weekExpenses = expenses.filter((e) => {
      const d = new Date(e.date);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    });
    const expensesTotal = weekExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Top expense category
    const categoryTotals: Record<string, number> = {};
    for (const e of weekExpenses) {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    }
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Habits completion rate (average across 7 days)
    let habitDayCompletions = 0;
    let habitDayTotal = 0;
    for (let i = 0; i < 7; i++) {
      const d = format(subDays(now, i), 'yyyy-MM-dd');
      const dailyHabits = habits.filter((h) => h.frequency === 'daily');
      if (dailyHabits.length > 0) {
        habitDayTotal += dailyHabits.length;
        habitDayCompletions += dailyHabits.filter((h) =>
          h.completedDates.includes(d),
        ).length;
      }
    }
    const habitsCompletionRate =
      habitDayTotal > 0
        ? Math.round((habitDayCompletions / habitDayTotal) * 100)
        : 0;

    // Meals planned count
    let mealsPlanCount = 0;
    for (let i = 0; i < 7; i++) {
      const d = format(subDays(now, i), 'yyyy-MM-dd');
      const plan = weekPlan.find((p) => p.date === d);
      if (plan) {
        if (plan.breakfast) mealsPlanCount++;
        if (plan.lunch) mealsPlanCount++;
        if (plan.dinner) mealsPlanCount++;
      }
    }

    // Events count
    const eventsCount = events.filter((e) => {
      const eventDate = e.startDate?.split?.('T')?.[0] ?? e.startDate;
      for (let i = 0; i < 7; i++) {
        if (eventDate === format(subDays(now, i), 'yyyy-MM-dd')) return true;
      }
      return false;
    }).length;

    // Wellness average mood
    const weekWellness = wellnessEntries.filter((e) => {
      const d = new Date(e.date);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    });
    const wellnessAvgMood =
      weekWellness.length > 0
        ? Math.round(
            (weekWellness.reduce((s, e) => s + e.mood, 0) / weekWellness.length) * 10,
          ) / 10
        : 0;

    // Savings deposited (approximation: sum currentAmount progress)
    const savingsDeposited = goals.reduce((sum, g) => sum + g.currentAmount, 0);

    // Highlights
    const highlights: string[] = [];
    if (tasksCompleted >= 5) highlights.push('Productive week — 5+ tasks done!');
    if (habitsCompletionRate >= 80) highlights.push('Habit champion — 80%+ completion');
    if (habitsCompletionRate >= 50 && habitsCompletionRate < 80)
      highlights.push('Solid habits — over 50% completion');
    if (mealsPlanCount >= 10) highlights.push('Meal planning pro!');
    if (wellnessAvgMood >= 4) highlights.push('Great mood this week');
    if (currentStreak >= 7) highlights.push(`${currentStreak}-day app streak!`);
    if (highlights.length === 0 && tasksCompleted > 0)
      highlights.push('Keep it up — every small step counts');

    return {
      weekLabel,
      tasksCompleted,
      totalTasks: tasks.length,
      expensesTotal,
      habitsCompletionRate,
      mealsPlanCount,
      eventsCount,
      wellnessAvgMood,
      wellnessEntryCount: weekWellness.length,
      savingsDeposited,
      streakDays: currentStreak,
      topCategory,
      currencySymbol: cs,
      highlights,
    };
  }, [tasks, expenses, habits, weekPlan, events, wellnessEntries, goals, currentStreak, cs]);
}
