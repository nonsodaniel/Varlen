import { useMemo } from 'react';
import { useExpenseStore } from '../stores/expenseStore';
import { useBudgetStore } from '../stores/budgetStore';
import { useTaskStore } from '../stores/taskStore';
import { useSavingsStore } from '../stores/savingsStore';
import { useSettingsStore } from '../stores/settingsStore';

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
  const cs = useSettingsStore((s) => s.currencySymbol) || '$';

  return useMemo(() => {
    const insights: InsightCard[] = [];
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthProgress = dayOfMonth / daysInMonth;

    // ── Spending insights ──

    // Categories over budget
    const overBudgetCategories = budgets.filter((b) => b.spent > b.limit && b.limit > 0);
    if (overBudgetCategories.length > 0) {
      const cat = overBudgetCategories[0];
      const overBy = Math.round(cat.spent - cat.limit);
      insights.push({
        id: 'over-budget',
        icon: 'alert-circle-outline',
        title: `${cat.category} over budget`,
        subtitle: `${cs}${overBy} over your ${cs}${cat.limit} limit`,
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

    // ── Task insights ──

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

    // ── Savings insights ──

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

    // Sort by priority (higher = more important) and return top 5
    return insights.sort((a, b) => b.priority - a.priority).slice(0, 5);
  }, [expenses, budgets, tasks, goals, cs]);
}
