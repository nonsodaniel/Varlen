import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
} from '../src/constants/theme';
import { useExpenseStore } from '../src/stores/expenseStore';
import { currentUser, partner, getUserName, getUserColor, mockExpenses } from '../src/data/mock';
import { Avatar } from '../src/components/ui/Avatar';

export default function SettleUpScreen() {
  const router = useRouter();
  const { expenses, settleExpense, getBalance } = useExpenseStore();
  const balance = getBalance();

  const unsettledExpenses = useMemo(
    () => expenses.filter((e) => !e.settled),
    [expenses]
  );

  const settledExpenses = useMemo(
    () => expenses.filter((e) => e.settled),
    [expenses]
  );

  const [showSettled, setShowSettled] = useState(false);

  const handleSettleAll = () => {
    Alert.alert(
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
    Alert.alert('Settle Expense', `Mark "${title}" as settled?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Settle',
        onPress: () => settleExpense(id),
      },
    ]);
  };

  const owesPerson =
    balance.net > 0
      ? `${partner.name} owes ${currentUser.name}`
      : balance.net < 0
      ? `${currentUser.name} owes ${partner.name}`
      : 'All settled up!';

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
        <Text style={styles.headerTitle}>Settle Up</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Summary */}
        <View style={styles.balanceCard}>
          <View style={styles.avatarRow}>
            <Avatar
              name={currentUser.name}
              size={48}
              color={getUserColor(currentUser.id)}
            />
            <Ionicons
              name="swap-horizontal"
              size={24}
              color={colors.textTertiary}
              style={{ marginHorizontal: spacing.md }}
            />
            <Avatar
              name={partner.name}
              size={48}
              color={getUserColor(partner.id)}
            />
          </View>
          <Text style={styles.balanceAmount}>
            ${Math.abs(balance.net).toFixed(2)}
          </Text>
          <Text style={styles.balanceLabel}>{owesPerson}</Text>
        </View>

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
                  </Text>
                </View>
                <Text style={styles.expenseAmount}>
                  ${expense.amount.toFixed(2)}
                </Text>
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

        {/* Settle All Button */}
        {unsettledExpenses.length > 0 && (
          <TouchableOpacity
            style={styles.settleAllBtn}
            activeOpacity={0.7}
            onPress={handleSettleAll}
          >
            <Ionicons
              name="checkmark-done"
              size={20}
              color={colors.textInverse}
            />
            <Text style={styles.settleAllText}>Settle All</Text>
          </TouchableOpacity>
        )}

        {/* Settled Expenses */}
        {settledExpenses.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.settledHeader}
              activeOpacity={0.7}
              onPress={() => setShowSettled(!showSettled)}
            >
              <Text style={styles.sectionTitle}>Settled</Text>
              <Ionicons
                name={showSettled ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {showSettled &&
              settledExpenses.map((expense) => (
                <View
                  key={expense.id}
                  style={[styles.expenseRow, styles.expenseRowSettled]}
                >
                  <View style={styles.expenseInfo}>
                    <Text
                      style={[styles.expenseTitle, styles.expenseTitleSettled]}
                    >
                      {expense.title}
                    </Text>
                    <Text style={styles.expenseMeta}>
                      {getUserName(expense.paidBy)} paid &middot;{' '}
                      {format(parseISO(expense.date), 'MMM d, yyyy')}
                    </Text>
                  </View>
                  <View style={styles.settledBadge}>
                    <Text style={styles.settledBadgeText}>Settled</Text>
                  </View>
                  <Text
                    style={[styles.expenseAmount, styles.expenseAmountSettled]}
                  >
                    ${expense.amount.toFixed(2)}
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },

  // Balance card
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  balanceAmount: {
    ...typography.largeTitle,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  balanceLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },

  // Section
  sectionTitle: {
    ...typography.title3,
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Expense row
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  expenseRowSettled: {
    opacity: 0.7,
  },
  expenseInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  expenseTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  expenseTitleSettled: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  expenseMeta: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  expenseAmount: {
    ...typography.headline,
    color: colors.text,
    marginRight: spacing.sm,
  },
  expenseAmountSettled: {
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  settleBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  settleBtnText: {
    ...typography.subhead,
    color: colors.primary,
  },
  settledBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginRight: spacing.sm,
  },
  settledBadgeText: {
    ...typography.caption1,
    color: colors.success,
  },

  // Settle All
  settleAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
    ...shadows.md,
  },
  settleAllText: {
    ...typography.headline,
    color: colors.textInverse,
  },

  // Settled section
  settledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
});
