import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import {
  typography,
  spacing,
  radius,
} from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useGoalStore } from '../src/stores/goalStore';
import { haptics } from '../src/hooks/useHaptics';

export default function GoalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { goals, updateProgress, deleteGoal, fetchGoals } = useGoalStore();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { fetchGoals(); }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGoals();
    setRefreshing(false);
  }, [fetchGoals]);

  const sortedGoals = useMemo(
    () =>
      [...goals].sort(
        (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      ),
    [goals]
  );

  const handleAddGoal = () => {
    router.push('/add-goal');
  };

  const handleDelete = (id: string, title: string) => {
    haptics.warning();
    Alert.alert('Delete Goal', `"${title}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGoal(id) },
    ]);
  };

  const handleIncrement = (id: string, amount: number) => {
    haptics.light();
    updateProgress(id, amount);
  };

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Goals</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleAddGoal}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedGoals}
        keyExtractor={(item) => item.id}
        renderItem={({ item: goal }) => {
          const achieved = goal.target > 0 ? Math.round((goal.progress / 100) * goal.target) : 0;
          return (
            <View style={styles.card}>
              <View
                style={[styles.accentStrip, { backgroundColor: goal.color }]}
              />
              <View style={styles.cardInner}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle}>{goal.title}</Text>
                  <View style={styles.cardTopRight}>
                    <Text style={[styles.percentage, { color: goal.progress >= 100 ? '#10B981' : goal.color }]}>
                      {goal.progress}%
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDelete(goal.id, goal.title)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(goal.progress, 100)}%`,
                        backgroundColor: goal.progress >= 100 ? '#10B981' : goal.color,
                      },
                    ]}
                  />
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.targetText}>
                    {achieved} / {goal.target} {goal.unit}
                  </Text>
                  {goal.deadline ? (() => {
                    try {
                      const d = parseISO(goal.deadline);
                      if (!isValid(d)) return null;
                      const days = differenceInDays(d, new Date());
                      const label = days < 0 ? 'Overdue' : days === 0 ? 'Due today' : `${days}d left`;
                      return (
                        <Text style={[styles.deadlineText, { color: days <= 0 ? colors.error : days <= 7 ? colors.warning : colors.textTertiary }]}>
                          {label}
                        </Text>
                      );
                    } catch { return null; }
                  })() : null}
                </View>

                {goal.progress < 100 ? (
                  <View style={styles.incrementRow}>
                    <Text style={styles.incrementLabel}>Add progress:</Text>
                    {[5, 10, 25].map((inc) => (
                      <TouchableOpacity
                        key={inc}
                        style={[styles.incBtn, { backgroundColor: goal.color + '18', borderColor: goal.color + '40' }]}
                        activeOpacity={0.7}
                        onPress={() => handleIncrement(goal.id, inc)}
                      >
                        <Text style={[styles.incBtnText, { color: goal.color }]}>+{inc}%</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.completedBadge}>
                    <Ionicons name="trophy" size={14} color="#10B981" />
                    <Text style={styles.completedText}>Goal achieved!</Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={56} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Dream big</Text>
            <Text style={styles.emptyDesc}>
              Set a goal and track your progress. What do you want to achieve?
            </Text>
            <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={handleAddGoal} activeOpacity={0.8}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Add your first goal</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={<View style={{ height: spacing['3xl'] }} />}
      />
    </View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.headline,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptyDesc: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  emptyBtnText: {
    ...typography.subhead,
    color: '#fff',
    fontWeight: '600',
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
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadows.sm,
  },
  accentStrip: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    padding: spacing.lg,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardTitle: {
    ...typography.headline,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  percentage: {
    ...typography.headline,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: 4,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  targetText: {
    ...typography.callout,
    color: colors.textSecondary,
  },
  deadlineText: {
    ...typography.caption1,
    fontWeight: '600',
  },
  incrementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  incrementLabel: {
    ...typography.caption1,
    color: colors.textTertiary,
    marginRight: 2,
  },
  incBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  incBtnText: {
    ...typography.subhead,
    fontWeight: '600',
    fontSize: 13,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  completedText: {
    ...typography.subhead,
    color: '#10B981',
    fontWeight: '600',
  },
});
