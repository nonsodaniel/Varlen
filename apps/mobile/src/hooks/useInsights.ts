import { useMemo } from 'react';
import { format, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { useExpenseStore } from '../stores/expenseStore';
import { useBudgetStore } from '../stores/budgetStore';
import { useTaskStore } from '../stores/taskStore';
import { useSavingsStore } from '../stores/savingsStore';
import { useHabitStore } from '../stores/habitStore';
import { useMealStore } from '../stores/mealStore';
import { useWellnessStore } from '../stores/wellnessStore';
import { useCalendarStore } from '../stores/calendarStore';
import { useListStore } from '../stores/listStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useStreakStore } from '../stores/streakStore';

export interface InsightCard {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  bg: string;
  route: string;
  params?: Record<string, string>;
  priority: number;
}

export function useInsights(): InsightCard[] {
  const expenses = useExpenseStore((s) => s.expenses);
  const budgets = useBudgetStore((s) => s.budgets);
  const tasks = useTaskStore((s) => s.tasks);
  const goals = useSavingsStore((s) => s.goals);
  const habits = useHabitStore((s) => s.habits);
  const weekPlan = useMealStore((s) => s.weekPlan);
  const wellnessEntries = useWellnessStore((s) => s.entries);
  const events = useCalendarStore((s) => s.events);
  const lists = useListStore((s) => s.lists);
  const cs = useSettingsStore((s) => s.currencySymbol) || '$';
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const bestStreak = useStreakStore((s) => s.bestStreak);
  const lastCheckInDate = useStreakStore((s) => s.lastCheckInDate);

  return useMemo(() => {
    const insights: InsightCard[] = [];
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthProgress = dayOfMonth / daysInMonth;

    // ── DAILY BRIEFING ──

    // Today's events count
    const todayEvents = events.filter((e) => {
      const eventDate = e.startDate?.split?.('T')?.[0] ?? e.startDate;
      return eventDate === todayStr;
    });
    if (todayEvents.length > 0) {
      const firstEvent = todayEvents[0];
      insights.push({
        id: 'today-events',
        icon: 'calendar-outline',
        title: `${todayEvents.length} event${todayEvents.length > 1 ? 's' : ''} today`,
        subtitle: todayEvents.length === 1
          ? `"${firstEvent.title}"`
          : `Including "${firstEvent.title}" and ${todayEvents.length - 1} more`,
        color: '#3B82F6',
        bg: '#EFF6FF',
        route: '/calendar',
        priority: 8,
      });
    }

    // Tomorrow's events preview
    const tomorrowStr = format(new Date(now.getTime() + 86400000), 'yyyy-MM-dd');
    const tomorrowEvents = events.filter((e) => {
      const eventDate = e.startDate?.split?.('T')?.[0] ?? e.startDate;
      return eventDate === tomorrowStr;
    });
    if (tomorrowEvents.length > 0 && todayEvents.length === 0) {
      insights.push({
        id: 'tomorrow-events',
        icon: 'calendar-outline',
        title: `${tomorrowEvents.length} event${tomorrowEvents.length > 1 ? 's' : ''} tomorrow`,
        subtitle: `"${tomorrowEvents[0].title}"${tomorrowEvents.length > 1 ? ` +${tomorrowEvents.length - 1} more` : ''}`,
        color: '#6366F1',
        bg: '#EEF2FF',
        route: '/calendar',
        priority: 4,
      });
    }

    // ── HABITS INSIGHTS ──

    // Habits not done today
    const habitsCompletedToday = habits.filter((h) => h.completedDates.includes(todayStr)).length;
    const habitsRemaining = habits.length - habitsCompletedToday;
    if (habits.length > 0 && habitsRemaining > 0) {
      insights.push({
        id: 'habits-remaining',
        icon: 'repeat-outline',
        title: `${habitsRemaining} habit${habitsRemaining > 1 ? 's' : ''} left today`,
        subtitle: habitsCompletedToday > 0
          ? `${habitsCompletedToday} done — keep the momentum going`
          : 'Start your day by checking off a habit',
        color: '#8B5CF6',
        bg: '#EDE9FE',
        route: '/(tabs)/lists',
        params: { section: 'routines' },
        priority: 7,
      });
    }

    // All habits done celebration
    if (habits.length > 0 && habitsRemaining === 0) {
      insights.push({
        id: 'habits-all-done',
        icon: 'ribbon-outline',
        title: 'All habits done!',
        subtitle: `${habits.length} habit${habits.length > 1 ? 's' : ''} completed today — nice work`,
        color: '#10B981',
        bg: '#D1FAE5',
        route: '/(tabs)/lists',
        params: { section: 'routines' },
        priority: 3,
      });
    }

    // Streak at risk (habit not done yesterday but had a streak)
    const yesterdayStr = format(new Date(now.getTime() - 86400000), 'yyyy-MM-dd');
    const atRiskHabits = habits.filter((h) =>
      h.streak > 2 &&
      !h.completedDates.includes(todayStr) &&
      h.completedDates.includes(yesterdayStr)
    );
    if (atRiskHabits.length > 0) {
      const h = atRiskHabits[0];
      insights.push({
        id: 'streak-at-risk',
        icon: 'flame-outline',
        title: `${h.streak}-day streak at risk!`,
        subtitle: `"${h.title}" — don't break the chain`,
        color: '#EF4444',
        bg: '#FEE2E2',
        route: '/(tabs)/lists',
        params: { section: 'routines' },
        priority: 11,
      });
    }

    // Streak milestone reached
    const milestoneHabits = habits.filter((h) => [7, 14, 21, 30, 50, 100].includes(h.streak));
    if (milestoneHabits.length > 0) {
      const h = milestoneHabits[0];
      insights.push({
        id: 'streak-milestone',
        icon: 'trophy-outline',
        title: `${h.streak}-day milestone!`,
        subtitle: `"${h.title}" — incredible consistency`,
        color: '#F59E0B',
        bg: '#FEF3C7',
        route: '/(tabs)/lists',
        params: { section: 'routines' },
        priority: 6,
      });
    }

    // ── MEAL PLANNING ──

    // No dinner planned today
    const todayPlan = weekPlan.find((p) => p.date === todayStr);
    if (todayPlan && !todayPlan.dinner) {
      const hasBreakfast = !!todayPlan.breakfast;
      const hasLunch = !!todayPlan.lunch;
      const emptySlots = [!hasBreakfast && 'breakfast', !hasLunch && 'lunch', 'dinner'].filter(Boolean);
      insights.push({
        id: 'no-dinner',
        icon: 'restaurant-outline',
        title: `${emptySlots.length} meal${emptySlots.length > 1 ? 's' : ''} not planned`,
        subtitle: `Plan your ${emptySlots.join(', ')} for today`,
        color: '#F97316',
        bg: '#FFF7ED',
        route: '/meal-plan',
        priority: 5,
      });
    } else if (!todayPlan && weekPlan.length > 0) {
      insights.push({
        id: 'no-meals-today',
        icon: 'restaurant-outline',
        title: 'No meals planned today',
        subtitle: 'Open meal planner to plan your day',
        color: '#F97316',
        bg: '#FFF7ED',
        route: '/meal-plan',
        priority: 4,
      });
    }

    // ── WELLNESS ──

    // Wellness not logged today
    const todayWellness = wellnessEntries.find((e) => e.date === todayStr);
    if (!todayWellness && wellnessEntries.length > 0) {
      // Only show if user has logged before (they use the feature)
      const lastEntry = wellnessEntries[wellnessEntries.length - 1];
      const daysSince = differenceInDays(now, new Date(lastEntry.date));
      if (daysSince <= 3) {
        insights.push({
          id: 'log-wellness',
          icon: 'heart-outline',
          title: 'Log your wellness',
          subtitle: 'Track mood, sleep & water to spot patterns',
          color: '#EC4899',
          bg: '#FCE7F3',
          route: '/add-wellness',
          priority: 3,
        });
      }
    }

    // Low mood trend (last 3 entries average mood < 2.5)
    if (wellnessEntries.length >= 3) {
      const recent3 = wellnessEntries.slice(-3);
      const avgMood = recent3.reduce((s, e) => s + e.mood, 0) / 3;
      if (avgMood < 2.5) {
        insights.push({
          id: 'low-mood',
          icon: 'sunny-outline',
          title: 'Mood has been low',
          subtitle: 'Consider some self-care today — you deserve it',
          color: '#6366F1',
          bg: '#EEF2FF',
          route: '/wellness-trends',
          priority: 6,
        });
      }
    }

    // ── SHOPPING LISTS ──

    // Unchecked items reminder
    const totalUnchecked = lists.reduce((sum, l) => sum + l.items.filter((i: any) => !i.checked).length, 0);
    if (totalUnchecked > 5) {
      const biggestList = lists.reduce((max, l) => {
        const unchecked = l.items.filter((i: any) => !i.checked).length;
        return unchecked > (max?.count || 0) ? { name: l.name, count: unchecked } : max;
      }, null as { name: string; count: number } | null);
      if (biggestList) {
        insights.push({
          id: 'shopping-reminder',
          icon: 'cart-outline',
          title: `${totalUnchecked} items to get`,
          subtitle: `${biggestList.count} items on "${biggestList.name}"`,
          color: '#059669',
          bg: '#D1FAE5',
          route: '/(tabs)/lists',
          params: { section: 'shopping' },
          priority: 3,
        });
      }
    }

    // ── SPENDING INSIGHTS ──

    // Categories over budget
    const overBudgetCategories = budgets.filter((b) => b.spent > b.limit && b.limit > 0);
    if (overBudgetCategories.length > 0) {
      const cat = overBudgetCategories[0];
      const overBy = Math.round(cat.spent - cat.limit);
      insights.push({
        id: 'over-budget',
        icon: 'alert-circle-outline',
        title: `${cat.category} over budget`,
        subtitle: `${cs}${overBy.toLocaleString()} over your ${cs}${cat.limit.toLocaleString()} limit`,
        color: '#EF4444',
        bg: '#FEE2E2',
        route: '/budget',
        priority: 10,
      });
    }

    // Budget pacing — spending faster than time
    const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
    const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
    if (totalLimit > 0) {
      const spentRatio = totalSpent / totalLimit;
      if (spentRatio > monthProgress + 0.15 && spentRatio < 1) {
        const dailyAvg = totalSpent / dayOfMonth;
        const projected = Math.round(dailyAvg * daysInMonth);
        insights.push({
          id: 'spending-pace',
          icon: 'trending-up-outline',
          title: 'Spending is ahead of pace',
          subtitle: `On track to spend ${cs}${projected.toLocaleString()} of your ${cs}${totalLimit.toLocaleString()} budget`,
          color: '#F59E0B',
          bg: '#FEF3C7',
          route: '/budget',
          priority: 7,
        });
      } else if (spentRatio < monthProgress - 0.2 && monthProgress > 0.5) {
        insights.push({
          id: 'under-budget',
          icon: 'checkmark-circle-outline',
          title: 'Under budget!',
          subtitle: `Only ${Math.round(spentRatio * 100)}% used with ${Math.round((1 - monthProgress) * 100)}% of the month left`,
          color: '#10B981',
          bg: '#D1FAE5',
          route: '/budget',
          priority: 4,
        });
      }
    }

    // ── TASK INSIGHTS ──

    // Overdue tasks
    const overdue = tasks.filter((t) => {
      if (t.completed || !t.dueDate) return false;
      return new Date(t.dueDate) < now;
    });
    if (overdue.length > 0) {
      insights.push({
        id: 'overdue-tasks',
        icon: 'time-outline',
        title: `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`,
        subtitle: overdue.length === 1
          ? `"${overdue[0].title}" is past due`
          : `Including "${overdue[0].title}" and ${overdue.length - 1} more`,
        color: '#EF4444',
        bg: '#FEE2E2',
        route: '/(tabs)/lists',
        params: { section: 'tasks' },
        priority: 9,
      });
    }

    // Tasks due today
    const dueToday = tasks.filter((t) => {
      if (t.completed || !t.dueDate) return false;
      return t.dueDate.split('T')[0] === todayStr;
    });
    if (dueToday.length > 0 && overdue.length === 0) {
      insights.push({
        id: 'tasks-due-today',
        icon: 'checkbox-outline',
        title: `${dueToday.length} task${dueToday.length > 1 ? 's' : ''} due today`,
        subtitle: `"${dueToday[0].title}"${dueToday.length > 1 ? ` +${dueToday.length - 1} more` : ''}`,
        color: '#3B82F6',
        bg: '#EFF6FF',
        route: '/(tabs)/lists',
        params: { section: 'tasks' },
        priority: 8,
      });
    }

    // Task completion rate
    const completedTasks = tasks.filter((t) => t.completed).length;
    const totalTasks = tasks.length;
    if (totalTasks >= 5 && completedTasks > 0) {
      const rate = Math.round((completedTasks / totalTasks) * 100);
      if (rate >= 80) {
        insights.push({
          id: 'task-streak',
          icon: 'flame-outline',
          title: 'On fire!',
          subtitle: `${completedTasks} of ${totalTasks} tasks done (${rate}%)`,
          color: '#F59E0B',
          bg: '#FEF3C7',
          route: '/(tabs)/lists',
          params: { section: 'tasks' },
          priority: 3,
        });
      }
    }

    // ── SAVINGS INSIGHTS ──

    // Goals near completion (>75%)
    const nearComplete = goals.filter((g) => {
      if (g.targetAmount <= 0) return false;
      const pct = g.currentAmount / g.targetAmount;
      return pct >= 0.75 && pct < 1;
    });
    if (nearComplete.length > 0) {
      const g = nearComplete[0];
      const remaining = Math.round(g.targetAmount - g.currentAmount);
      insights.push({
        id: 'goal-near',
        icon: 'flag-outline',
        title: `Almost there!`,
        subtitle: `"${g.title}" needs just ${cs}${remaining.toLocaleString()} more`,
        color: '#8B5CF6',
        bg: '#EDE9FE',
        route: '/savings',
        priority: 6,
      });
    }

    // Completed goals — celebrate
    const completedGoals = goals.filter((g) => {
      if (g.targetAmount <= 0) return false;
      return g.currentAmount >= g.targetAmount;
    });
    if (completedGoals.length > 0) {
      insights.push({
        id: 'goal-done',
        icon: 'trophy-outline',
        title: 'Goal reached!',
        subtitle: `"${completedGoals[0].title}" is fully funded`,
        color: '#10B981',
        bg: '#D1FAE5',
        route: '/savings',
        priority: 5,
      });
    }

    // ── STREAK INSIGHTS ──

    // Streak milestone
    if ([7, 14, 21, 30, 50, 100].includes(currentStreak)) {
      insights.push({
        id: 'streak-milestone',
        icon: 'flame-outline',
        title: `${currentStreak}-day streak!`,
        subtitle: `You've opened the app ${currentStreak} days in a row`,
        color: '#F59E0B',
        bg: '#FEF3C7',
        route: '/(tabs)/profile',
        priority: 9,
      });
    }

    // Streak at risk
    if (lastCheckInDate === yesterdayStr && currentStreak > 3) {
      insights.push({
        id: 'streak-risk',
        icon: 'flame-outline',
        title: `${currentStreak}-day streak at risk`,
        subtitle: "Don't forget to check in tomorrow",
        color: '#EF4444',
        bg: '#FEE2E2',
        route: '/(tabs)/profile',
        priority: 8,
      });
    }

    // ── CHALLENGE INSIGHTS ──

    // Challenge near completion (computed inline to avoid circular deps)
    // We check if any habit is at 6/7 streak or all-but-one habits done today
    const habitsToday = habits.filter((h) => h.completedDates.includes(todayStr)).length;
    if (habits.length > 0 && habitsToday === habits.length - 1) {
      insights.push({
        id: 'challenge-almost',
        icon: 'trophy-outline',
        title: 'Almost there!',
        subtitle: `Just 1 more habit to complete today's challenge`,
        color: '#F59E0B',
        bg: '#FEF3C7',
        route: '/challenges',
        priority: 5,
      });
    }

    // Weekly recap ready (Sunday or Monday)
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 1) {
      insights.push({
        id: 'weekly-recap',
        icon: 'bar-chart-outline',
        title: 'Weekly recap ready',
        subtitle: 'See how your week went',
        color: '#6366F1',
        bg: '#EEF2FF',
        route: '/weekly-recap',
        priority: 4,
      });
    }

    // Sort by priority (higher = more important) and return top 6
    return insights.sort((a, b) => b.priority - a.priority).slice(0, 6);
  }, [expenses, budgets, tasks, goals, habits, weekPlan, wellnessEntries, events, lists, cs, currentStreak, bestStreak, lastCheckInDate]);
}
