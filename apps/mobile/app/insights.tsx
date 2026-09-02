import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { usePremiumGate } from '../src/hooks/usePremiumGate';
import { useTaskStore } from '../src/stores/taskStore';
import { useHabitStore } from '../src/stores/habitStore';
import { useExpenseStore } from '../src/stores/expenseStore';
import { useCalendarStore } from '../src/stores/calendarStore';
import { useSettingsStore } from '../src/stores/settingsStore';

interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
}

const typeConfig: Record<string, { color: string; icon: string }> = {
  achievement: { color: '#10B981', icon: 'trophy-outline' },
  tip: { color: '#6366F1', icon: 'bulb-outline' },
  reminder: { color: '#F59E0B', icon: 'alarm-outline' },
};

export default function InsightsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { requirePremium } = usePremiumGate();

  const tasks = useTaskStore((s) => s.tasks);
  const habits = useHabitStore((s) => s.habits);
  const expenses = useExpenseStore((s) => s.expenses);
  const events = useCalendarStore((s) => s.events);
  const currencySymbol = useSettingsStore((s) => s.currencySymbol) ?? '$';

  useFocusEffect(useCallback(() => { requirePremium('budgets_insights'); }, [requirePremium]));

  const insights = useMemo((): Insight[] => {
    const result: Insight[] = [];
    const now = new Date();

    // Completed tasks achievement
    const completedCount = tasks.filter((t) => t.completed).length;
    const pendingCount = tasks.filter((t) => !t.completed).length;
    if (completedCount >= 3) {
      result.push({
        id: 'tasks-done',
        type: 'achievement',
        title: `${completedCount} task${completedCount > 1 ? 's' : ''} completed`,
        description: `Great progress! ${pendingCount > 0 ? `${pendingCount} task${pendingCount !== 1 ? 's' : ''} still remaining — keep going.` : 'Everything is done!'}`,
      });
    }

    // Overdue tasks
    const overdue = tasks.filter(
      (t) => !t.completed && t.dueDate && new Date(t.dueDate) < now,
    );
    if (overdue.length > 0) {
      result.push({
        id: 'overdue',
        type: 'reminder',
        title: `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`,
        description: `"${overdue[0].title}"${overdue.length > 1 ? ` and ${overdue.length - 1} more are` : ' is'} past due. Take a moment to catch up.`,
      });
    }

    // High-priority tasks
    const highPriority = tasks.filter((t) => !t.completed && t.priority === 'high');
    if (highPriority.length > 0) {
      result.push({
        id: 'high-priority',
        type: 'reminder',
        title: `${highPriority.length} high-priority task${highPriority.length > 1 ? 's' : ''}`,
        description: `"${highPriority[0].title}" needs your attention${highPriority.length > 1 ? ` along with ${highPriority.length - 1} others` : ''}.`,
      });
    }

    // Best habit streak
    const habitsWithStreak = habits.filter((h) => h.streak > 0).sort((a, b) => b.streak - a.streak);
    if (habitsWithStreak.length > 0) {
      const best = habitsWithStreak[0];
      result.push({
        id: 'habit-streak',
        type: 'achievement',
        title: `${best.streak}-day streak on "${best.title}"`,
        description: best.streak >= 14
          ? 'Two weeks of consistency — that\'s impressive dedication!'
          : best.streak >= 7
          ? 'A full week streak! You\'re building a solid habit.'
          : 'Great start! Keep showing up every day to build momentum.',
      });
    } else if (habits.length > 0) {
      result.push({
        id: 'habit-start',
        type: 'tip',
        title: 'Start your streak today',
        description: 'Mark your habits as done each day to build a streak. Even small daily actions compound into big results.',
      });
    }

    // Expense insights
    if (expenses.length > 0) {
      const catTotals: Record<string, number> = {};
      expenses.forEach((e) => {
        catTotals[e.category] = (catTotals[e.category] ?? 0) + e.amount;
      });
      const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
      const [topCat, topAmount] = sorted[0];
      const total = expenses.reduce((s, e) => s + e.amount, 0);
      const pct = Math.round((topAmount / total) * 100);
      result.push({
        id: 'top-spend',
        type: 'tip',
        title: `${topCat.charAt(0).toUpperCase() + topCat.slice(1)} is your top spend`,
        description: `${currencySymbol}${topAmount.toFixed(0)} (${pct}% of total). ${pct > 50 ? 'That\'s more than half your spending — worth reviewing.' : 'Looks balanced overall.'}`,
      });

      // Unsettled expenses
      const unsettled = expenses.filter((e) => !e.settled);
      if (unsettled.length > 0) {
        const unsettledTotal = unsettled.reduce((s, e) => s + e.amount, 0);
        result.push({
          id: 'unsettled',
          type: 'reminder',
          title: `${unsettled.length} unsettled expense${unsettled.length > 1 ? 's' : ''}`,
          description: `${currencySymbol}${unsettledTotal.toFixed(2)} is still outstanding. Head to expenses to settle up.`,
        });
      }
    }

    // Upcoming events
    const upcoming = events.filter((e) => new Date(e.startDate) > now);
    if (upcoming.length > 0) {
      const next = upcoming.sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
      result.push({
        id: 'events',
        type: 'reminder',
        title: `${upcoming.length} upcoming event${upcoming.length > 1 ? 's' : ''}`,
        description: upcoming.length > 5
          ? 'Busy schedule ahead! Review your calendar to stay on top of everything.'
          : `Your next event is "${next.title}". Check your calendar for details.`,
      });
    }

    // Welcome state when no data
    if (result.length === 0) {
      result.push({
        id: 'welcome',
        type: 'tip',
        title: 'Your insights will appear here',
        description: 'Add tasks, log expenses, and track habits to get personalized tips and achievements tailored to your lifestyle.',
      });
    }

    return result;
  }, [tasks, habits, expenses, events, currencySymbol]);

  return (
    <View style={styles.safe}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Insights</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {insights.map((insight) => {
          const config = typeConfig[insight.type] || typeConfig.tip;

          return (
            <View key={insight.id} style={styles.card}>
              <View style={[styles.accentBar, { backgroundColor: config.color }]} />
              <View style={styles.cardInner}>
                <View style={[styles.iconCircle, { backgroundColor: config.color + '18' }]}>
                  <Ionicons name={config.icon as any} size={20} color={config.color} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{insight.title}</Text>
                  <Text style={styles.cardDescription}>{insight.description}</Text>
                </View>
              </View>
            </View>
          );
        })}

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  accentBar: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
