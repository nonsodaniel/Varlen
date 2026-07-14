import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, subMonths, startOfMonth, endOfMonth, isWithinInterval, differenceInDays } from 'date-fns';
import {
  typography,
  spacing,
  radius,
} from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { adaptTintColor } from '../src/utils/tintColors';
import { useExpenseStore } from '../src/stores/expenseStore';
import { useBudgetStore } from '../src/stores/budgetStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAlert } from '../src/components/AlertProvider';
import { useFocusEffect } from '@react-navigation/native';
import type { ExpenseCategory } from '../src/types';

const SCREEN_WIDTH = Dimensions.get('window').width;

const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  groceries: { label: 'Groceries', icon: 'cart-outline', color: '#10B981', bgColor: '#ECFDF5' },
  dining: { label: 'Dining', icon: 'restaurant-outline', color: '#F59E0B', bgColor: '#FFF8E1' },
  utilities: { label: 'Utilities', icon: 'flash-outline', color: '#3B82F6', bgColor: '#DBEAFE' },
  rent: { label: 'Rent', icon: 'home-outline', color: '#8B5CF6', bgColor: '#EDE9FE' },
  transport: { label: 'Transport', icon: 'car-outline', color: '#06B6D4', bgColor: '#CFFAFE' },
  entertainment: { label: 'Entertainment', icon: 'film-outline', color: '#EC4899', bgColor: '#FCE7F3' },
  health: { label: 'Health', icon: 'fitness-outline', color: '#EF4444', bgColor: '#FEE2E2' },
  other: { label: 'Other', icon: 'ellipsis-horizontal-outline', color: '#6B7280', bgColor: '#F3F4F6' },
};

type ViewMode = 'this-month' | 'last-month' | '3-months';

export default function ExpenseInsightsScreen() {
  const router = useRouter();
  const { colors, shadows, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { expenses, fetchExpenses, deleteExpense } = useExpenseStore();
  const { budgets, fetchBudgets } = useBudgetStore();
  const cs = useSettingsStore((s) => s.currencySymbol) || '$';
  const { showAlert } = useAlert();
  const [viewMode, setViewMode] = useState<ViewMode>('this-month');

  useFocusEffect(useCallback(() => { fetchExpenses(); fetchBudgets(); }, []));

  const now = new Date();

  const filtered = useMemo(() => {
    let start: Date;
    let end: Date;

    if (viewMode === 'this-month') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else if (viewMode === 'last-month') {
      start = startOfMonth(subMonths(now, 1));
      end = endOfMonth(subMonths(now, 1));
    } else {
      start = startOfMonth(subMonths(now, 2));
      end = endOfMonth(now);
    }

    return expenses.filter((e) => {
      const d = parseISO(e.date);
      return isWithinInterval(d, { start, end });
    });
  }, [expenses, viewMode]);

  const totalSpent = useMemo(
    () => filtered.reduce((s, e) => s + e.amount, 0),
    [filtered],
  );

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<ExpenseCategory, number>();
    filtered.forEach((e) => {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
        config: CATEGORY_CONFIG[category],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filtered, totalSpent]);

  // Month-over-month comparison
  const monthComparison = useMemo(() => {
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const thisMonthTotal = expenses
      .filter((e) => isWithinInterval(parseISO(e.date), { start: thisMonthStart, end: thisMonthEnd }))
      .reduce((s, e) => s + e.amount, 0);

    const lastMonthTotal = expenses
      .filter((e) => isWithinInterval(parseISO(e.date), { start: lastMonthStart, end: lastMonthEnd }))
      .reduce((s, e) => s + e.amount, 0);

    const change = lastMonthTotal > 0
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : 0;

    return { thisMonthTotal, lastMonthTotal, change };
  }, [expenses]);

  // Top expenses
  const topExpenses = useMemo(() => {
    return [...filtered]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filtered]);

  // Monthly totals for 3-month bar chart
  const monthlyTotals = useMemo(() => {
    return [2, 1, 0].map((offset) => {
      const month = subMonths(now, offset);
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const total = expenses
        .filter((e) => isWithinInterval(parseISO(e.date), { start, end }))
        .reduce((s, e) => s + e.amount, 0);
      return {
        label: format(month, 'MMM'),
        total,
      };
    });
  }, [expenses]);

  // Daily average
  const dailyAverage = useMemo(() => {
    if (filtered.length === 0) return 0;
    let start: Date;
    let end: Date;
    if (viewMode === 'this-month') {
      start = startOfMonth(now);
      end = now; // up to today
    } else if (viewMode === 'last-month') {
      start = startOfMonth(subMonths(now, 1));
      end = endOfMonth(subMonths(now, 1));
    } else {
      start = startOfMonth(subMonths(now, 2));
      end = now;
    }
    const days = Math.max(differenceInDays(end, start) + 1, 1);
    return totalSpent / days;
  }, [filtered, totalSpent, viewMode]);

  // Budget lookup for category comparison
  const budgetMap = useMemo(() => {
    const map = new Map<string, number>();
    budgets.forEach((b) => map.set(b.category, b.limit));
    return map;
  }, [budgets]);

  const handleDeleteExpense = (id: string, title: string) => {
    showAlert('Delete Expense', `Remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(id) },
    ]);
  };

  const maxMonthly = Math.max(...monthlyTotals.map((m) => m.total), 1);
  const maxCategory = Math.max(...categoryBreakdown.map((c) => c.amount), 1);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expense Insights</Text>
        <TouchableOpacity
          style={styles.logExpenseHeaderBtn}
          onPress={() => router.push('/add-expense' as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Time Range Selector */}
        <View style={styles.rangeRow}>
          {([
            { key: 'this-month' as ViewMode, label: 'This Month' },
            { key: 'last-month' as ViewMode, label: 'Last Month' },
            { key: '3-months' as ViewMode, label: '3 Months' },
          ]).map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.rangeBtn, viewMode === r.key && styles.rangeBtnActive]}
              onPress={() => setViewMode(r.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.rangeBtnText,
                  viewMode === r.key && styles.rangeBtnTextActive,
                ]}
              >
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Total Spent Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Spent</Text>
          <Text style={styles.totalAmount}>{cs}{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={styles.totalCount}>{filtered.length} transactions</Text>

          {viewMode === 'this-month' && monthComparison.lastMonthTotal > 0 && (
            <View style={styles.changeRow}>
              <Ionicons
                name={monthComparison.change >= 0 ? 'trending-up' : 'trending-down'}
                size={16}
                color={monthComparison.change >= 0 ? colors.error : colors.success}
              />
              <Text
                style={[
                  styles.changeText,
                  { color: monthComparison.change >= 0 ? colors.error : colors.success },
                ]}
              >
                {Math.abs(Math.round(monthComparison.change))}%{' '}
                {monthComparison.change >= 0 ? 'more' : 'less'} than last month
              </Text>
            </View>
          )}
        </View>

        {/* Daily Average Stats */}
        {filtered.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={styles.statValue}>{cs}{dailyAverage.toFixed(2)}</Text>
              <Text style={styles.statLabel}>per day</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="receipt-outline" size={16} color={colors.warning} />
              <Text style={styles.statValue}>{filtered.length}</Text>
              <Text style={styles.statLabel}>transactions</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="pricetag-outline" size={16} color={colors.success} />
              <Text style={styles.statValue}>{categoryBreakdown.length}</Text>
              <Text style={styles.statLabel}>categories</Text>
            </View>
          </View>
        )}

        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="pie-chart-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No expenses</Text>
            <Text style={styles.emptyDesc}>
              Add expenses to see spending breakdowns and insights.
            </Text>
          </View>
        ) : (
          <>
            {/* Category Breakdown */}
            <Text style={styles.sectionTitle}>By Category</Text>
            {categoryBreakdown.map((item) => {
              const budgetLimit = budgetMap.get(item.category);
              const isOverBudget = budgetLimit != null && item.amount > budgetLimit;
              return (
                <View key={item.category} style={styles.categoryRow}>
                  <View style={[styles.categoryIcon, { backgroundColor: adaptTintColor(item.config.bgColor, isDark) }]}>
                    <Ionicons name={item.config.icon as any} size={18} color={item.config.color} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <View style={styles.categoryTop}>
                      <Text style={styles.categoryLabel}>{item.config.label}</Text>
                      <Text style={[
                        styles.categoryAmount,
                        isOverBudget && { color: colors.error },
                      ]}>
                        {cs}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <View style={styles.categoryBarBg}>
                      {/* Budget limit marker */}
                      {budgetLimit != null && budgetLimit > 0 && (
                        <View
                          style={[
                            styles.categoryBudgetMarker,
                            { left: `${Math.min(Math.round((budgetLimit / maxCategory) * 100), 100)}%` },
                          ]}
                        />
                      )}
                      <View
                        style={[
                          styles.categoryBarFill,
                          {
                            width: `${Math.round((item.amount / maxCategory) * 100)}%`,
                            backgroundColor: isOverBudget ? colors.error : item.config.color,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.categoryBottomRow}>
                      <Text style={styles.categoryPercent}>
                        {Math.round(item.percentage)}% of total
                      </Text>
                      {budgetLimit != null && (
                        <Text style={[
                          styles.categoryBudgetText,
                          { color: isOverBudget ? colors.error : colors.success },
                        ]}>
                          {isOverBudget
                            ? `${cs}${(item.amount - budgetLimit).toFixed(0)} over budget`
                            : `${cs}${(budgetLimit - item.amount).toFixed(0)} under budget`
                          }
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Monthly Comparison Chart */}
            <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Monthly Comparison</Text>
            <View style={styles.monthChart}>
              {monthlyTotals.map((month, idx) => {
                const barHeight = maxMonthly > 0 ? (month.total / maxMonthly) * 120 : 0;
                const isCurrentMonth = idx === monthlyTotals.length - 1;
                return (
                  <View key={month.label} style={styles.monthBarGroup}>
                    <Text style={styles.monthBarAmount}>
                      {cs}{Math.round(month.total).toLocaleString()}
                    </Text>
                    <View style={styles.monthBarWrapper}>
                      <View
                        style={[
                          styles.monthBar,
                          {
                            height: Math.max(barHeight, 4),
                            backgroundColor: isCurrentMonth ? colors.primary : colors.primaryMuted,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[
                      styles.monthBarLabel,
                      isCurrentMonth && { color: colors.primary, fontWeight: '700' },
                    ]}>
                      {month.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Top Expenses */}
            {topExpenses.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
                  Top Expenses
                </Text>
                {topExpenses.map((expense, idx) => {
                  const config = CATEGORY_CONFIG[expense.category];
                  return (
                    <TouchableOpacity
                      key={expense.id}
                      style={styles.topExpenseRow}
                      activeOpacity={0.8}
                      onLongPress={() => handleDeleteExpense(expense.id, expense.title)}
                    >
                      <Text style={styles.topExpenseRank}>{idx + 1}</Text>
                      <View style={[styles.topExpenseIcon, { backgroundColor: adaptTintColor(config.bgColor, isDark) }]}>
                        <Ionicons name={config.icon as any} size={16} color={config.color} />
                      </View>
                      <View style={styles.topExpenseInfo}>
                        <Text style={styles.topExpenseName} numberOfLines={1}>
                          {expense.title}
                        </Text>
                        <Text style={styles.topExpenseDate}>
                          {format(parseISO(expense.date), 'MMM d')} · {config.label}
                        </Text>
                      </View>
                      <Text style={styles.topExpenseAmount}>
                        {cs}{expense.amount.toFixed(2)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* Log Expense CTA */}
        <TouchableOpacity
          style={styles.logExpenseCta}
          onPress={() => router.push('/add-expense' as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle" size={20} color={colors.textInverse} />
          <Text style={styles.logExpenseCtaText}>Log Expense</Text>
        </TouchableOpacity>

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...typography.headline, color: colors.text },
  logExpenseHeaderBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },

  // Range selector
  rangeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    ...shadows.sm,
  },
  rangeBtnActive: { backgroundColor: colors.primary },
  rangeBtnText: { ...typography.subhead, color: colors.textSecondary },
  rangeBtnTextActive: { color: colors.textInverse },

  // Total card
  totalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
  },
  totalLabel: { ...typography.subhead, color: colors.textSecondary, marginBottom: spacing.xs },
  totalAmount: { ...typography.largeTitle, color: colors.text, fontSize: 36 },
  totalCount: { ...typography.caption1, color: colors.textTertiary, marginTop: spacing.xs },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: radius.full,
  },
  changeText: { ...typography.caption1, fontWeight: '600' },

  // Stats row
  statsRow: {
    flexDirection: 'row', gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1, alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    paddingVertical: spacing.md, ...shadows.sm,
  },
  statValue: { ...typography.headline, color: colors.text, fontSize: 15 },
  statLabel: { ...typography.caption2, color: colors.textTertiary },

  // Empty
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.md,
  },
  emptyTitle: { ...typography.headline, color: colors.text },
  emptyDesc: {
    ...typography.body, color: colors.textSecondary,
    textAlign: 'center', paddingHorizontal: spacing.lg,
  },

  // Section
  sectionTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Category breakdown
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    ...shadows.sm,
  },
  categoryIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  categoryInfo: { flex: 1 },
  categoryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  categoryLabel: { ...typography.body, color: colors.text, fontWeight: '600' },
  categoryAmount: { ...typography.subhead, color: colors.text, fontWeight: '700' },
  categoryBarBg: {
    height: 6, borderRadius: 3,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
  },
  categoryBarFill: { height: '100%', borderRadius: 3 },
  categoryBudgetMarker: {
    position: 'absolute', top: -2, width: 2, height: 10,
    backgroundColor: colors.textTertiary, borderRadius: 1, zIndex: 1,
  },
  categoryBottomRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 3,
  },
  categoryPercent: { ...typography.caption2, color: colors.textTertiary },
  categoryBudgetText: { ...typography.caption2, fontWeight: '600' },

  // Monthly chart
  monthChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.md,
  },
  monthBarGroup: {
    alignItems: 'center',
    flex: 1,
  },
  monthBarAmount: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  monthBarWrapper: {
    height: 120,
    justifyContent: 'flex-end',
    width: 40,
  },
  monthBar: {
    width: 40,
    borderRadius: 8,
    minHeight: 4,
  },
  monthBarLabel: {
    ...typography.subhead,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  // Top expenses
  topExpenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
    ...shadows.sm,
  },
  topExpenseRank: {
    ...typography.subhead,
    color: colors.textTertiary,
    width: 20,
    textAlign: 'center',
  },
  topExpenseIcon: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  topExpenseInfo: { flex: 1 },
  topExpenseName: { ...typography.body, color: colors.text, fontWeight: '600' },
  topExpenseDate: { ...typography.caption2, color: colors.textTertiary, marginTop: 1 },
  topExpenseAmount: { ...typography.subhead, color: colors.text, fontWeight: '700' },

  // Log expense CTA
  logExpenseCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.md, marginTop: spacing.xl,
    ...shadows.md,
  },
  logExpenseCtaText: { ...typography.headline, color: colors.textInverse, fontSize: 15 },
});
