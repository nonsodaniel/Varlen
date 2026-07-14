import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, differenceInDays, getDaysInMonth, getDate } from 'date-fns';
import {
  typography,
  spacing,
  radius,
} from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { adaptTintColor } from '../src/utils/tintColors';
import { useBudgetStore } from '../src/stores/budgetStore';
import { useAlert } from '../src/components/AlertProvider';
import { useSubscriptionStore } from '../src/stores/subscriptionStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import type { ExpenseCategory } from '../src/types';

const CATEGORY_CONFIG: {
  key: ExpenseCategory;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}[] = [
  { key: 'groceries', label: 'Groceries', icon: 'cart-outline', color: '#10B981', bgColor: '#ECFDF5' },
  { key: 'dining', label: 'Dining', icon: 'restaurant-outline', color: '#F59E0B', bgColor: '#FFF8E1' },
  { key: 'utilities', label: 'Utilities', icon: 'flash-outline', color: '#3B82F6', bgColor: '#DBEAFE' },
  { key: 'rent', label: 'Rent', icon: 'home-outline', color: '#8B5CF6', bgColor: '#EDE9FE' },
  { key: 'transport', label: 'Transport', icon: 'car-outline', color: '#06B6D4', bgColor: '#CFFAFE' },
  { key: 'entertainment', label: 'Entertainment', icon: 'film-outline', color: '#EC4899', bgColor: '#FCE7F3' },
  { key: 'health', label: 'Health', icon: 'fitness-outline', color: '#EF4444', bgColor: '#FEE2E2' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', color: '#6B7280', bgColor: '#F3F4F6' },
];

export default function BudgetScreen() {
  const router = useRouter();
  const { colors, shadows, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { budgets, addBudget, updateBudget, deleteBudget, fetchBudgets } = useBudgetStore();
  const { showAlert } = useAlert();
  const { subscriptions, fetchSubscriptions, getMonthlyTotal, deleteSubscription } = useSubscriptionStore();
  const cs = useSettingsStore((s) => s.currencySymbol) || '$';

  useFocusEffect(useCallback(() => { fetchBudgets(); fetchSubscriptions(); }, []));

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [limitAmount, setLimitAmount] = useState('');

  // Edit budget state
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editLimitAmount, setEditLimitAmount] = useState('');

  const totalLimit = useMemo(() => budgets.reduce((s, b) => s + b.limit, 0), [budgets]);
  const totalSpent = useMemo(() => budgets.reduce((s, b) => s + b.spent, 0), [budgets]);
  const totalRemaining = totalLimit - totalSpent;
  const overallProgress = totalLimit > 0 ? Math.min(totalSpent / totalLimit, 1) : 0;

  // Velocity calculations
  const today = new Date();
  const dayOfMonth = getDate(today);
  const daysInMonth = getDaysInMonth(today);
  const timeElapsed = dayOfMonth / daysInMonth; // 0-1 how far through the month

  const velocityAlerts = useMemo(() => {
    return budgets
      .filter((b) => b.limit > 0)
      .map((budget) => {
        const spendRate = budget.spent / budget.limit; // how much spent (0-1)
        const projectedSpend = timeElapsed > 0 ? (budget.spent / timeElapsed) : 0;
        const projectedOverspend = projectedSpend - budget.limit;
        const pace = timeElapsed > 0 ? spendRate / timeElapsed : 0; // >1 means overspending

        let status: 'on-track' | 'warning' | 'danger' = 'on-track';
        if (pace > 1.3) status = 'danger';
        else if (pace > 1.0) status = 'warning';

        return {
          ...budget,
          pace,
          projectedSpend: Math.round(projectedSpend),
          projectedOverspend: Math.round(projectedOverspend),
          status,
        };
      })
      .filter((a) => a.status !== 'on-track' && a.spent > 0);
  }, [budgets, timeElapsed]);

  const availableCategories = useMemo(() => {
    const usedCategories = budgets.map((b) => b.category);
    return CATEGORY_CONFIG.filter((c) => !usedCategories.includes(c.key));
  }, [budgets]);

  const handleAddBudget = async () => {
    if (!selectedCategory || !limitAmount.trim()) return;
    Keyboard.dismiss();
    const amount = parseFloat(limitAmount);
    if (isNaN(amount) || amount <= 0) {
      showAlert('Invalid amount', 'Please enter a valid budget limit.');
      return;
    }
    await addBudget({
      category: selectedCategory,
      limit: amount,
      spent: 0,
      period: 'monthly',
    });
    setShowAddForm(false);
    setSelectedCategory(null);
    setLimitAmount('');
  };

  const daysRemaining = daysInMonth - dayOfMonth + 1;
  const dailyAllowance = totalRemaining > 0 && totalLimit > 0
    ? totalRemaining / daysRemaining
    : 0;

  const handleEditBudget = (budgetId: string, currentLimit: number) => {
    setEditingBudgetId(budgetId);
    setEditLimitAmount(currentLimit.toString());
  };

  const handleSaveEdit = async () => {
    if (!editingBudgetId || !editLimitAmount.trim()) return;
    const amount = parseFloat(editLimitAmount);
    if (isNaN(amount) || amount <= 0) {
      showAlert('Invalid amount', 'Please enter a valid budget limit.');
      return;
    }
    Keyboard.dismiss();
    await updateBudget(editingBudgetId, { limit: amount });
    setEditingBudgetId(null);
    setEditLimitAmount('');
  };

  const handleDeleteBudget = (id: string, category: string) => {
    showAlert('Delete Budget', `Remove the ${category} budget?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteBudget(id) },
    ]);
  };

  const getCategoryConfig = (category: ExpenseCategory) => {
    return CATEGORY_CONFIG.find((c) => c.key === category) ?? CATEGORY_CONFIG[CATEGORY_CONFIG.length - 1];
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Budget Planner</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.insightsBtn}
            onPress={() => router.push('/expense-insights' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="analytics-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddForm(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={22} color={colors.textInverse} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Overview Card */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>Monthly Budget</Text>
          <Text style={styles.overviewAmount}>{cs}{totalLimit.toLocaleString()}</Text>
          <View style={styles.overviewRow}>
            <View style={styles.overviewStat}>
              <View style={[styles.overviewDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.overviewStatLabel}>Spent</Text>
              <Text style={styles.overviewStatValue}>{cs}{totalSpent.toLocaleString()}</Text>
            </View>
            <View style={styles.overviewStat}>
              <View style={[styles.overviewDot, { backgroundColor: colors.success }]} />
              <Text style={styles.overviewStatLabel}>Remaining</Text>
              <Text style={[styles.overviewStatValue, { color: totalRemaining >= 0 ? colors.success : colors.error }]}>
                {cs}{Math.abs(totalRemaining).toLocaleString()}
              </Text>
            </View>
          </View>
          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.round(overallProgress * 100)}%`,
                  backgroundColor: overallProgress > 0.9 ? colors.error : overallProgress > 0.7 ? colors.warning : colors.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.overviewPercent}>
            {Math.round(overallProgress * 100)}% used
          </Text>
          {dailyAllowance > 0 && (
            <View style={styles.dailyAllowanceRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.success} />
              <Text style={styles.dailyAllowanceText}>
                {cs}{dailyAllowance.toFixed(2)}/day for the next {daysRemaining} days
              </Text>
            </View>
          )}
        </View>

        {/* Velocity Alerts */}
        {velocityAlerts.length > 0 && (
          <View style={styles.velocitySection}>
            <View style={styles.velocityHeader}>
              <Ionicons name="speedometer-outline" size={18} color={colors.warning} />
              <Text style={styles.velocityTitle}>Spending Pace</Text>
            </View>
            {velocityAlerts.map((alert) => {
              const config = getCategoryConfig(alert.category);
              const isDanger = alert.status === 'danger';
              return (
                <View
                  key={alert.id}
                  style={[
                    styles.velocityCard,
                    { borderLeftColor: isDanger ? colors.error : colors.warning },
                  ]}
                >
                  <View style={styles.velocityTop}>
                    <View style={[styles.velocityIcon, { backgroundColor: adaptTintColor(config.bgColor, isDark) }]}>
                      <Ionicons name={config.icon as any} size={16} color={config.color} />
                    </View>
                    <View style={styles.velocityInfo}>
                      <Text style={styles.velocityCategory}>{config.label}</Text>
                      <Text style={styles.velocityDetail}>
                        {isDanger ? 'Overspending' : 'Spending fast'} — on track to spend{' '}
                        <Text style={{ fontWeight: '700', color: isDanger ? colors.error : colors.warning }}>
                          {cs}{alert.projectedSpend.toLocaleString()}
                        </Text>
                        {' '}of {cs}{alert.limit.toLocaleString()} limit
                      </Text>
                    </View>
                  </View>
                  <View style={styles.velocityBarBg}>
                    <View
                      style={[
                        styles.velocityBarTime,
                        { width: `${Math.round(timeElapsed * 100)}%` },
                      ]}
                    />
                    <View
                      style={[
                        styles.velocityBarSpend,
                        {
                          width: `${Math.min(Math.round((alert.spent / alert.limit) * 100), 100)}%`,
                          backgroundColor: isDanger ? colors.error : colors.warning,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.velocityLabels}>
                    <Text style={styles.velocityLabelText}>
                      {Math.round(timeElapsed * 100)}% of month
                    </Text>
                    <Text style={styles.velocityLabelText}>
                      {Math.round((alert.spent / alert.limit) * 100)}% spent
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Budget Categories */}
        {budgets.length === 0 && !showAddForm && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="wallet-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No budgets set</Text>
            <Text style={styles.emptyDesc}>
              Set spending limits by category to stay on track each month.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              activeOpacity={0.7}
              onPress={() => setShowAddForm(true)}
            >
              <Ionicons name="add" size={16} color={colors.textInverse} />
              <Text style={styles.emptyBtnText}>Create Budget</Text>
            </TouchableOpacity>
          </View>
        )}

        {budgets.map((budget) => {
          const config = getCategoryConfig(budget.category);
          const progress = budget.limit > 0 ? Math.min(budget.spent / budget.limit, 1) : 0;
          const remaining = budget.limit - budget.spent;
          const pace = budget.limit > 0 && timeElapsed > 0
            ? (budget.spent / budget.limit) / timeElapsed
            : 0;
          const paceStatus = pace > 1.3 ? 'danger' : pace > 1.0 ? 'warning' : 'on-track';

          const isEditing = editingBudgetId === budget.id;

          return (
            <TouchableOpacity
              key={budget.id}
              style={styles.budgetCard}
              activeOpacity={0.8}
              onPress={() => handleEditBudget(budget.id, budget.limit)}
              onLongPress={() => handleDeleteBudget(budget.id, config.label)}
            >
              <View style={styles.budgetTop}>
                <View style={[styles.budgetIcon, { backgroundColor: adaptTintColor(config.bgColor, isDark) }]}>
                  <Ionicons name={config.icon as any} size={20} color={config.color} />
                </View>
                <View style={styles.budgetInfo}>
                  <View style={styles.budgetCategoryRow}>
                    <Text style={styles.budgetCategory}>{config.label}</Text>
                    {budget.spent > 0 && paceStatus !== 'on-track' && (
                      <View style={[
                        styles.paceChip,
                        { backgroundColor: paceStatus === 'danger' ? colors.errorLight : colors.warningLight },
                      ]}>
                        <Ionicons
                          name="trending-up"
                          size={10}
                          color={paceStatus === 'danger' ? colors.error : colors.warning}
                        />
                        <Text style={[
                          styles.paceChipText,
                          { color: paceStatus === 'danger' ? colors.error : colors.warning },
                        ]}>
                          {Math.round(pace * 100)}%
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.budgetLimit}>
                    {cs}{budget.spent.toLocaleString()} / {cs}{budget.limit.toLocaleString()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.budgetRemaining,
                    { color: remaining >= 0 ? colors.success : colors.error },
                  ]}
                >
                  {remaining >= 0 ? `${cs}${remaining.toLocaleString()} left` : `-${cs}${Math.abs(remaining).toLocaleString()}`}
                </Text>
              </View>
              <View style={[styles.budgetProgressBg, { backgroundColor: adaptTintColor(config.bgColor, isDark) }]}>
                <View
                  style={[
                    styles.budgetProgressFill,
                    {
                      width: `${Math.round(progress * 100)}%`,
                      backgroundColor: progress > 0.9 ? colors.error : config.color,
                    },
                  ]}
                />
              </View>

              {/* Inline edit row */}
              {isEditing && (
                <View style={styles.editRow}>
                  <View style={styles.editInputWrap}>
                    <Text style={styles.editCurrency}>{cs}</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editLimitAmount}
                      onChangeText={setEditLimitAmount}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={colors.textTertiary}
                      autoFocus
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.editSaveBtn, { backgroundColor: config.color }]}
                    onPress={handleSaveEdit}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editSaveBtnText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editCancelBtn}
                    onPress={() => { setEditingBudgetId(null); setEditLimitAmount(''); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Add Budget Form */}
        {showAddForm && (
          <View style={styles.addFormCard}>
            <Text style={styles.addFormTitle}>New Budget</Text>

            {/* Category picker */}
            <Text style={styles.addFormLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {availableCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat.key && { backgroundColor: adaptTintColor(cat.bgColor, isDark), borderColor: cat.color },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedCategory(cat.key)}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={16}
                    color={selectedCategory === cat.key ? cat.color : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === cat.key && { color: cat.color, fontWeight: '600' },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {availableCategories.length === 0 && (
              <Text style={styles.noCategoriesText}>All categories have budgets set.</Text>
            )}

            {/* Limit input */}
            <Text style={styles.addFormLabel}>Monthly Limit</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.currencySymbol}>{cs}</Text>
              <TextInput
                style={styles.amountInput}
                value={limitAmount}
                onChangeText={setLimitAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            {/* Actions */}
            <View style={styles.addFormActions}>
              <TouchableOpacity
                style={styles.cancelFormBtn}
                onPress={() => { setShowAddForm(false); setSelectedCategory(null); setLimitAmount(''); }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelFormText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveFormBtn, (!selectedCategory || !limitAmount.trim()) && styles.saveFormBtnDisabled]}
                onPress={handleAddBudget}
                disabled={!selectedCategory || !limitAmount.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.saveFormText}>Add Budget</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Subscriptions Section */}
        {subscriptions.length > 0 && (
          <>
            <View style={styles.subsHeader}>
              <Text style={styles.subsTitle}>Recurring Subscriptions</Text>
              <Text style={styles.subsTotal}>{cs}{Math.round(getMonthlyTotal()).toLocaleString()}/mo</Text>
            </View>
            {subscriptions.map((sub) => {
              const daysUntil = sub.nextBillingDate
                ? differenceInDays(parseISO(sub.nextBillingDate), new Date())
                : null;
              return (
                <TouchableOpacity
                  key={sub.id}
                  style={styles.subCard}
                  activeOpacity={0.8}
                  onLongPress={() => {
                    showAlert('Remove Subscription', `Delete "${sub.name}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteSubscription(sub.id) },
                    ]);
                  }}
                >
                  <View style={[styles.subIcon, { backgroundColor: colors.purpleLight }]}>
                    <Ionicons name="card-outline" size={18} color="#8B5CF6" />
                  </View>
                  <View style={styles.subInfo}>
                    <Text style={styles.subName}>{sub.name}</Text>
                    <Text style={styles.subMeta}>
                      {sub.cycle === 'yearly' ? 'Yearly' : 'Monthly'}
                      {daysUntil != null && daysUntil >= 0 ? ` \u00B7 Due in ${daysUntil}d` : ''}
                      {sub.shared ? ' \u00B7 Shared' : ''}
                    </Text>
                  </View>
                  <Text style={styles.subAmount}>
                    {cs}{sub.amount.toFixed(2)}/{sub.cycle === 'yearly' ? 'yr' : 'mo'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Savings Goals Link */}
        <TouchableOpacity
          style={styles.savingsLink}
          activeOpacity={0.7}
          onPress={() => router.push('/savings' as any)}
        >
          <View style={[styles.savingsLinkIcon, { backgroundColor: colors.successLight }]}>
            <Ionicons name="trending-up-outline" size={20} color="#10B981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.savingsLinkTitle}>Savings Goals</Text>
            <Text style={styles.savingsLinkDesc}>Track progress toward your targets</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  insightsBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },

  // Overview
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  overviewLabel: { ...typography.subhead, color: colors.textSecondary, marginBottom: spacing.xs },
  overviewAmount: { ...typography.largeTitle, color: colors.text, marginBottom: spacing.md },
  overviewRow: { flexDirection: 'row', gap: spacing.xl, marginBottom: spacing.md },
  overviewStat: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  overviewDot: { width: 8, height: 8, borderRadius: 4 },
  overviewStatLabel: { ...typography.caption1, color: colors.textSecondary },
  overviewStatValue: { ...typography.subhead, color: colors.text, fontWeight: '600' },
  progressBarBg: {
    height: 8, borderRadius: 4,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 4 },
  overviewPercent: { ...typography.caption1, color: colors.textTertiary, marginTop: spacing.xs, textAlign: 'right' },
  dailyAllowanceRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  dailyAllowanceText: { ...typography.subhead, color: colors.success, fontWeight: '600' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: spacing['2xl'] },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { ...typography.headline, color: colors.text, marginBottom: spacing.xs },
  emptyDesc: { ...typography.body, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  emptyBtnText: { ...typography.subhead, color: colors.textInverse, fontWeight: '600' },

  // Budget cards
  budgetCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  budgetTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  budgetIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  budgetInfo: { flex: 1 },
  budgetCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  budgetCategory: { ...typography.headline, color: colors.text, fontSize: 15 },
  paceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: radius.full,
  },
  paceChipText: { ...typography.caption2, fontWeight: '700' },
  budgetLimit: { ...typography.caption1, color: colors.textSecondary },
  budgetRemaining: { ...typography.subhead, fontWeight: '600' },
  budgetProgressBg: {
    height: 6, borderRadius: 3, overflow: 'hidden',
  },
  budgetProgressFill: { height: '100%', borderRadius: 3 },

  // Edit row
  editRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  editInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: radius.md,
    paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.borderLight,
  },
  editCurrency: { ...typography.body, color: colors.textSecondary, marginRight: spacing.xs },
  editInput: { flex: 1, ...typography.body, color: colors.text, paddingVertical: spacing.sm },
  editSaveBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md,
  },
  editSaveBtnText: { ...typography.subhead, color: '#fff', fontWeight: '600' },
  editCancelBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
  },

  // Add form
  addFormCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginTop: spacing.md,
    ...shadows.md,
  },
  addFormTitle: { ...typography.title3, color: colors.text, marginBottom: spacing.lg },
  addFormLabel: { ...typography.subhead, color: colors.textSecondary, marginBottom: spacing.sm },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5,
    borderColor: colors.borderLight, backgroundColor: colors.background,
  },
  categoryChipText: { ...typography.subhead, color: colors.textSecondary },
  noCategoriesText: { ...typography.body, color: colors.textTertiary, marginBottom: spacing.xl },
  amountInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: radius.lg,
    paddingHorizontal: spacing.lg, marginBottom: spacing.xl,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  currencySymbol: { ...typography.title3, color: colors.textSecondary, marginRight: spacing.xs },
  amountInput: {
    flex: 1, ...typography.title3, color: colors.text,
    paddingVertical: spacing.md,
  },
  addFormActions: { flexDirection: 'row', gap: spacing.md },
  cancelFormBtn: {
    flex: 1, alignItems: 'center',
    paddingVertical: spacing.md, borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  cancelFormText: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
  saveFormBtn: {
    flex: 1, alignItems: 'center',
    paddingVertical: spacing.md, borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  saveFormBtnDisabled: { opacity: 0.4 },
  saveFormText: { ...typography.body, color: colors.textInverse, fontWeight: '600' },

  // Subscriptions
  subsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.xl, marginBottom: spacing.md,
  },
  subsTitle: { ...typography.title3, color: colors.text },
  subsTotal: { ...typography.subhead, color: colors.textSecondary, fontWeight: '600' },
  subCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.sm, ...shadows.sm,
  },
  subIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  subInfo: { flex: 1 },
  subName: { ...typography.headline, color: colors.text, fontSize: 15 },
  subMeta: { ...typography.caption1, color: colors.textTertiary, marginTop: 2 },
  subAmount: { ...typography.subhead, color: colors.text, fontWeight: '600' },

  // Savings link
  savingsLink: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginTop: spacing.xl, ...shadows.sm,
  },
  savingsLinkIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  savingsLinkTitle: { ...typography.headline, color: colors.text, fontSize: 15 },
  savingsLinkDesc: { ...typography.caption1, color: colors.textSecondary, marginTop: 2 },

  // Velocity alerts
  velocitySection: {
    marginBottom: spacing.xl,
  },
  velocityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  velocityTitle: { ...typography.headline, color: colors.text },
  velocityCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    ...shadows.sm,
  },
  velocityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  velocityIcon: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.sm,
  },
  velocityInfo: { flex: 1 },
  velocityCategory: { ...typography.subhead, color: colors.text, fontWeight: '600' },
  velocityDetail: { ...typography.caption1, color: colors.textSecondary, marginTop: 2 },
  velocityBarBg: {
    height: 6, borderRadius: 3,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  velocityBarTime: {
    position: 'absolute',
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.borderLight,
    opacity: 0.5,
  },
  velocityBarSpend: {
    height: '100%',
    borderRadius: 3,
  },
  velocityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  velocityLabelText: { ...typography.caption2, color: colors.textTertiary },
});
