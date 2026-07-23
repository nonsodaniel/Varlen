import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import {
  typography,
  spacing,
  radius,
} from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useExpenseStore } from '../src/stores/expenseStore';
import { useAlert } from '../src/components/AlertProvider';
import { useAuthStore } from '../src/stores/authStore';
import { useHouseholdStore } from '../src/stores/householdStore';
import { useModeStore } from '../src/stores/modeStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import { getUserName, getUserColor } from '../src/utils/userHelpers';
import { Avatar } from '../src/components/ui/Avatar';
import { useFocusEffect } from '@react-navigation/native';

export default function SettleUpScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const cs = useSettingsStore((s) => s.currencySymbol) || '$';
  const { expenses, settleExpense, getBalance, fetchExpenses } = useExpenseStore();

  useFocusEffect(useCallback(() => { fetchExpenses(); }, []));
  const { showAlert } = useAlert();
  const currentUser = useAuthStore((s) => s.user);
  const members = useHouseholdStore((s) => s.members);
  const { mode } = useModeStore();

  const isSingle = mode === 'personal';
  const isMultiMember = mode === 'family' || mode === 'parenting';

  const partner = members.find((m) => m.id !== currentUser?.id) ?? { id: '', name: 'Partner' };
  const balance = getBalance();

  const unsettledExpenses = useMemo(
    () => expenses.filter((e) => !e.settled),
    [expenses]
  );

  const settledExpenses = useMemo(
    () => expenses.filter((e) => e.settled),
    [expenses]
  );

  // For family mode: calculate per-member balances
  const memberBalances = useMemo(() => {
    if (!isMultiMember) return [];
    const allMembers = members.map((m) => ({ id: m.id, name: m.name, color: m.color || colors.primary }));
    const balanceMap: Record<string, number> = {};
    allMembers.forEach((m) => { balanceMap[m.id] = 0; });

    unsettledExpenses.forEach((e) => {
      const splitCount = e.splitBetween.length || 1;
      const perPerson = e.amount / splitCount;
      // Person who paid is owed by others
      e.splitBetween.forEach((memberId) => {
        if (memberId !== e.paidBy) {
          balanceMap[e.paidBy] = (balanceMap[e.paidBy] ?? 0) + perPerson;
          balanceMap[memberId] = (balanceMap[memberId] ?? 0) - perPerson;
        }
      });
    });

    return allMembers.map((m) => ({
      ...m,
      net: Math.round((balanceMap[m.id] ?? 0) * 100) / 100,
    }));
  }, [isMultiMember, members, unsettledExpenses]);

  // Single mode: spending summary
  const spendingSummary = useMemo(() => {
    if (!isSingle) return { total: 0, thisMonth: 0, count: 0 };
    const now = new Date();
    const monthStr = format(now, 'yyyy-MM');
    const monthExpenses = expenses.filter((e) => e.date.startsWith(monthStr));
    return {
      total: expenses.reduce((s, e) => s + e.amount, 0),
      thisMonth: monthExpenses.reduce((s, e) => s + e.amount, 0),
      count: monthExpenses.length,
    };
  }, [isSingle, expenses]);

  const [showSettled, setShowSettled] = useState(false);

  const handleSettleAll = () => {
    showAlert(
      'Settle All',
      `Mark all ${unsettledExpenses.length} expenses as settled?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settle All',
          onPress: () => {
            unsettledExpenses.forEach((e) => settleExpense(e.id));
          },
        },
      ]
    );
  };

  const handleSettleOne = (id: string, title: string) => {
    showAlert('Settle Expense', `Mark "${title}" as settled?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Settle', onPress: () => settleExpense(id) },
    ]);
  };

  // ─── SINGLE MODE ──────────────────────────
  if (isSingle) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Spending</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Summary card */}
          <View style={styles.balanceCard}>
            <View style={styles.singleSummaryIcon}>
              <Ionicons name="wallet-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.balanceAmount}>{cs}{spendingSummary.thisMonth.toFixed(2)}</Text>
            <Text style={styles.balanceLabel}>Spent this month</Text>
            <View style={styles.singleStatsRow}>
              <View style={styles.singleStat}>
                <Text style={styles.singleStatValue}>{spendingSummary.count}</Text>
                <Text style={styles.singleStatLabel}>Transactions</Text>
              </View>
              <View style={styles.singleStatDivider} />
              <View style={styles.singleStat}>
                <Text style={styles.singleStatValue}>{cs}{spendingSummary.total.toFixed(0)}</Text>
                <Text style={styles.singleStatLabel}>All time</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.addExpenseBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/add-expense')}
            >
              <Ionicons name="add" size={16} color={colors.textInverse} />
              <Text style={styles.addExpenseBtnText}>Log Expense</Text>
            </TouchableOpacity>
          </View>

          {/* Quick links */}
          <View style={styles.quickLinks}>
            <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/budget' as any)} activeOpacity={0.7}>
              <View style={[styles.quickLinkIcon, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="pie-chart-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.quickLinkText}>Budget</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/savings' as any)} activeOpacity={0.7}>
              <View style={[styles.quickLinkIcon, { backgroundColor: colors.successLight }]}>
                <Ionicons name="trending-up-outline" size={20} color="#10B981" />
              </View>
              <Text style={styles.quickLinkText}>Savings Goals</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Recent expenses */}
          {expenses.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Recent Expenses</Text>
              {expenses.slice(0, 10).map((expense) => (
                <View key={expense.id} style={styles.expenseRow}>
                  <View style={styles.expenseInfo}>
                    <Text style={styles.expenseTitle}>{expense.title}</Text>
                    <Text style={styles.expenseMeta}>
                      {format(parseISO(expense.date), 'MMM d')} &middot; {expense.category}
                    </Text>
                  </View>
                  <Text style={styles.expenseAmount}>{cs}{expense.amount.toFixed(2)}</Text>
                </View>
              ))}
            </>
          )}

          {expenses.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Track your spending</Text>
              <Text style={styles.emptyDesc}>
                Log expenses to see where your money goes and stay on budget.
              </Text>
            </View>
          )}

          <View style={{ height: spacing['3xl'] }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── COUPLE / FAMILY / PARENTING MODE ──────────────────────────
  const owesPerson = isMultiMember
    ? (balance.net === 0 ? 'All settled up!' : `Net: ${balance.net > 0 ? 'You are owed' : 'You owe'}`)
    : balance.net > 0
      ? `${partner.name} owes ${currentUser?.name ?? 'You'}`
      : balance.net < 0
        ? `${currentUser?.name ?? 'You'} owes ${partner.name}`
        : 'All settled up!';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settle Up</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Balance Summary */}
        {!isMultiMember ? (
          // Couple mode: 2-person balance
          <View style={styles.balanceCard}>
            <View style={styles.avatarRow}>
              <Avatar name={currentUser?.name ?? 'You'} size={48} color={getUserColor(currentUser?.id ?? '')} />
              <Ionicons name="swap-horizontal" size={24} color={colors.textTertiary} style={{ marginHorizontal: spacing.md }} />
              <Avatar name={partner.id ? (partner.name ?? '?') : '?'} size={48} color={partner.id ? getUserColor(partner.id) : colors.textTertiary} />
            </View>
            <Text style={styles.balanceAmount}>{cs}{Math.abs(balance.net).toFixed(2)}</Text>
            <Text style={styles.balanceLabel}>{owesPerson}</Text>
            <TouchableOpacity
              style={styles.addExpenseBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/add-expense')}
            >
              <Ionicons name="add" size={16} color={colors.textInverse} />
              <Text style={styles.addExpenseBtnText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Family/Parenting mode: multi-member balances
          <View style={styles.balanceCard}>
            <Text style={styles.familyBalanceTitle}>Household Balance</Text>
            <View style={styles.familyMembersList}>
              {memberBalances.map((member) => (
                <View key={member.id} style={styles.familyMemberRow}>
                  <Avatar name={member.name} size={36} color={member.color} />
                  <Text style={styles.familyMemberName}>
                    {member.id === currentUser?.id ? 'You' : member.name}
                  </Text>
                  <Text style={[
                    styles.familyMemberBalance,
                    { color: member.net >= 0 ? colors.success : colors.error },
                  ]}>
                    {member.net >= 0 ? '+' : '-'}{cs}{Math.abs(member.net).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.addExpenseBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/add-expense')}
            >
              <Ionicons name="add" size={16} color={colors.textInverse} />
              <Text style={styles.addExpenseBtnText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state */}
        {expenses.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="receipt-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptyDesc}>
              {isMultiMember
                ? 'Add shared expenses to track who owes what across your household.'
                : 'Add shared expenses to track who owes what and settle up easily.'}
            </Text>
          </View>
        )}

        {/* Unsettled Expenses */}
        {unsettledExpenses.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Unsettled</Text>
            {unsettledExpenses.map((expense) => (
              <View key={expense.id} style={styles.expenseRow}>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseTitle}>{expense.title}</Text>
                  <Text style={styles.expenseMeta}>
                    {getUserName(expense.paidBy)} paid &middot;{' '}
                    {format(parseISO(expense.date), 'MMM d, yyyy')}
                    {isMultiMember && ` \u00B7 ${expense.splitBetween.length}-way split`}
                  </Text>
                </View>
                <Text style={styles.expenseAmount}>{cs}{expense.amount.toFixed(2)}</Text>
                <TouchableOpacity
                  style={styles.settleBtn}
                  activeOpacity={0.7}
                  onPress={() => handleSettleOne(expense.id, expense.title)}
                >
                  <Text style={styles.settleBtnText}>Settle</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* Settle All */}
        {unsettledExpenses.length > 0 && (
          <TouchableOpacity style={styles.settleAllBtn} activeOpacity={0.7} onPress={handleSettleAll}>
            <Ionicons name="checkmark-done" size={20} color={colors.textInverse} />
            <Text style={styles.settleAllText}>Settle All</Text>
          </TouchableOpacity>
        )}

        {/* Settled History */}
        {settledExpenses.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.settledHeader}
              activeOpacity={0.7}
              onPress={() => setShowSettled(!showSettled)}
            >
              <Text style={styles.sectionTitle}>Settled</Text>
              <Ionicons name={showSettled ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {showSettled && settledExpenses.map((expense) => (
              <View key={expense.id} style={[styles.expenseRow, styles.expenseRowSettled]}>
                <View style={styles.expenseInfo}>
                  <Text style={[styles.expenseTitle, styles.expenseTitleSettled]}>{expense.title}</Text>
                  <Text style={styles.expenseMeta}>
                    {getUserName(expense.paidBy)} paid &middot;{' '}
                    {format(parseISO(expense.date), 'MMM d, yyyy')}
                  </Text>
                </View>
                <View style={styles.settledBadge}>
                  <Text style={styles.settledBadgeText}>Settled</Text>
                </View>
                <Text style={[styles.expenseAmount, styles.expenseAmountSettled]}>
                  {cs}{expense.amount.toFixed(2)}
                </Text>
              </View>
            ))}
          </>
        )}

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    backgroundColor: colors.surface, ...shadows.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...typography.headline, color: colors.text, flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },

  // Balance card
  balanceCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing['2xl'], alignItems: 'center',
    marginBottom: spacing.xl, ...shadows.md,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  balanceAmount: { ...typography.largeTitle, color: colors.text, marginBottom: spacing.xs },
  balanceLabel: { ...typography.body, color: colors.textSecondary },
  addExpenseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, marginTop: spacing.lg,
  },
  addExpenseBtnText: { ...typography.subhead, color: colors.textInverse, fontWeight: '600' },

  // Single mode
  singleSummaryIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  singleStatsRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: spacing.lg, paddingTop: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.borderLight, width: '100%',
  },
  singleStat: { flex: 1, alignItems: 'center' },
  singleStatValue: { ...typography.headline, color: colors.text },
  singleStatLabel: { ...typography.caption1, color: colors.textTertiary, marginTop: 2 },
  singleStatDivider: { width: 1, height: 30, backgroundColor: colors.borderLight },

  // Quick links (single mode)
  quickLinks: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    marginBottom: spacing.xl, overflow: 'hidden', ...shadows.sm,
  },
  quickLink: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  quickLinkIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  quickLinkText: { ...typography.body, color: colors.text, flex: 1 },

  // Family mode balance
  familyBalanceTitle: { ...typography.title3, color: colors.text, marginBottom: spacing.lg },
  familyMembersList: { width: '100%', marginBottom: spacing.md },
  familyMemberRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  familyMemberName: { ...typography.body, color: colors.text, flex: 1 },
  familyMemberBalance: { ...typography.headline, fontWeight: '700' },

  // Section
  sectionTitle: { ...typography.title3, color: colors.text, marginBottom: spacing.md },

  // Expense row
  expenseRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.sm, ...shadows.sm,
  },
  expenseRowSettled: { opacity: 0.7 },
  expenseInfo: { flex: 1, marginRight: spacing.sm },
  expenseTitle: { ...typography.headline, color: colors.text, marginBottom: spacing.xs },
  expenseTitleSettled: { textDecorationLine: 'line-through', color: colors.textSecondary },
  expenseMeta: { ...typography.caption1, color: colors.textTertiary },
  expenseAmount: { ...typography.headline, color: colors.text, marginRight: spacing.sm },
  expenseAmountSettled: { color: colors.textTertiary, textDecorationLine: 'line-through' },
  settleBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  settleBtnText: { ...typography.subhead, color: colors.primary },
  settledBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: radius.full, marginRight: spacing.sm,
  },
  settledBadgeText: { ...typography.caption1, color: colors.success },

  // Settle All
  settleAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.lg, marginTop: spacing.md, marginBottom: spacing.xl,
    gap: spacing.sm, ...shadows.md,
  },
  settleAllText: { ...typography.headline, color: colors.textInverse },

  // Settled section
  settledHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md, marginTop: spacing.sm,
  },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: spacing['2xl'] },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  emptyTitle: { ...typography.headline, color: colors.text, marginBottom: spacing.xs },
  emptyDesc: {
    ...typography.body, color: colors.textSecondary,
    textAlign: 'center', paddingHorizontal: spacing.xl,
  },
});
