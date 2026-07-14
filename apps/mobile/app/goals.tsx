import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isValid } from 'date-fns';
import {
  typography,
  spacing,
  radius,
} from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useGoalStore } from '../src/stores/goalStore';

export default function GoalsScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { goals, updateProgress, fetchGoals } = useGoalStore();
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
                  <Text style={styles.percentage}>{goal.progress}%</Text>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(goal.progress, 100)}%`,
                        backgroundColor: goal.color,
                      },
                    ]}
                  />
                </View>

                <Text style={styles.targetText}>
                  {achieved} / {goal.target} {goal.unit}
                </Text>
                {goal.deadline ? (
                  <Text style={styles.deadlineText}>
                    Due {(() => { try { const d = parseISO(goal.deadline); return isValid(d) ? format(d, 'MMM d, yyyy') : 'No date'; } catch { return 'No date'; } })()}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.updateBtn, { backgroundColor: goal.color + '20' }]}
                  activeOpacity={0.7}
                  onPress={() => updateProgress(goal.id, 5)}
                >
                  <Ionicons name="add-circle-outline" size={18} color={goal.color} />
                  <Text style={[styles.updateBtnText, { color: goal.color }]}>
                    Update
                  </Text>
                </TouchableOpacity>
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
            <Text style={styles.emptyTitle}>Dream big!</Text>
            <Text style={styles.emptyDesc}>
              Set a goal and watch your progress grow. What would you like to achieve?
            </Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: spacing['3xl'] }} />}
      />
    </SafeAreaView>
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
  cardTitle: {
    ...typography.headline,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  percentage: {
    ...typography.headline,
    color: colors.textSecondary,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  targetText: {
    ...typography.callout,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  deadlineText: {
    ...typography.caption1,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    gap: spacing.xs,
  },
  updateBtnText: {
    ...typography.subhead,
  },
});
