import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
import { format, subDays, parseISO, isAfter } from 'date-fns';
import {
  typography,
  spacing,
  radius,
} from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { useWellnessStore } from '../src/stores/wellnessStore';
import { usePremiumGate } from '../src/hooks/usePremiumGate';

const MOOD_EMOJIS = ['', '😔', '😐', '🙂', '😊', '🤩'];
const MOOD_LABELS = ['', 'Rough', 'Meh', 'Okay', 'Good', 'Great'];
const MOOD_COLORS = ['', '#EF4444', '#F59E0B', '#6B7280', '#3B82F6', '#10B981'];

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_PADDING = spacing.xl * 2;
const CHART_WIDTH = SCREEN_WIDTH - CHART_PADDING - spacing.xl;

type TimeRange = '7d' | '14d' | '30d';

export default function WellnessTrendsScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { requirePremium } = usePremiumGate();
  const { entries, fetchEntries } = useWellnessStore();
  const [range, setRange] = useState<TimeRange>('7d');

  useFocusEffect(useCallback(() => { requirePremium('wellness_trends'); }, [requirePremium]));

  useEffect(() => {
    fetchEntries();
  }, []);

  const daysCount = range === '7d' ? 7 : range === '14d' ? 14 : 30;
  const cutoff = subDays(new Date(), daysCount);

  const filtered = useMemo(() => {
    return entries
      .filter((e) => {
        const d = parseISO(e.date);
        return isAfter(d, cutoff);
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, range]);

  // Aggregated stats
  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const avgMood = filtered.reduce((s, e) => s + e.mood, 0) / filtered.length;
    const avgSleep = filtered.reduce((s, e) => s + e.sleep, 0) / filtered.length;
    const avgWater = filtered.reduce((s, e) => s + e.water, 0) / filtered.length;
    const exerciseDays = filtered.filter((e) => e.exercise).length;
    const exerciseRate = Math.round((exerciseDays / filtered.length) * 100);

    // Best / worst mood days
    const bestDay = filtered.reduce((best, e) => (e.mood > best.mood ? e : best), filtered[0]);
    const worstDay = filtered.reduce((worst, e) => (e.mood < worst.mood ? e : worst), filtered[0]);

    return { avgMood, avgSleep, avgWater, exerciseDays, exerciseRate, bestDay, worstDay };
  }, [filtered]);

  // Correlation insights
  const insights = useMemo(() => {
    if (filtered.length < 3) return [];
    const result: { icon: string; text: string; color: string }[] = [];

    // Sleep vs mood
    const goodSleep = filtered.filter((e) => e.sleep >= 7);
    const badSleep = filtered.filter((e) => e.sleep < 6);
    if (goodSleep.length > 0 && badSleep.length > 0) {
      const goodMoodAvg = goodSleep.reduce((s, e) => s + e.mood, 0) / goodSleep.length;
      const badMoodAvg = badSleep.reduce((s, e) => s + e.mood, 0) / badSleep.length;
      if (goodMoodAvg - badMoodAvg > 0.5) {
        result.push({
          icon: 'moon-outline',
          text: `You feel ${(goodMoodAvg - badMoodAvg).toFixed(1)} points happier on days with 7+ hours of sleep`,
          color: '#8B5CF6',
        });
      }
    }

    // Exercise vs mood
    const exercised = filtered.filter((e) => e.exercise);
    const noExercise = filtered.filter((e) => !e.exercise);
    if (exercised.length > 0 && noExercise.length > 0) {
      const exMood = exercised.reduce((s, e) => s + e.mood, 0) / exercised.length;
      const noExMood = noExercise.reduce((s, e) => s + e.mood, 0) / noExercise.length;
      if (exMood - noExMood > 0.3) {
        result.push({
          icon: 'fitness-outline',
          text: `Exercise days boost your mood by ${(exMood - noExMood).toFixed(1)} points on average`,
          color: '#10B981',
        });
      }
    }

    // Water vs mood
    const wellHydrated = filtered.filter((e) => e.water >= 6);
    const dehydrated = filtered.filter((e) => e.water < 4);
    if (wellHydrated.length > 0 && dehydrated.length > 0) {
      const hydMood = wellHydrated.reduce((s, e) => s + e.mood, 0) / wellHydrated.length;
      const dehMood = dehydrated.reduce((s, e) => s + e.mood, 0) / dehydrated.length;
      if (hydMood - dehMood > 0.3) {
        result.push({
          icon: 'water-outline',
          text: `Drinking 6+ glasses of water correlates with better mood`,
          color: '#3B82F6',
        });
      }
    }

    if (result.length === 0) {
      result.push({
        icon: 'bulb-outline',
        text: 'Keep logging to unlock mood correlations and personalized insights',
        color: '#F59E0B',
      });
    }

    return result;
  }, [filtered]);

  const barWidth = Math.min(
    (CHART_WIDTH - (filtered.length - 1) * 4) / Math.max(filtered.length, 1),
    32,
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wellness Trends</Text>
        <TouchableOpacity
          onPress={() => router.push('/add-wellness')}
          style={styles.addBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Time Range Selector */}
        <View style={styles.rangeRow}>
          {(['7d', '14d', '30d'] as TimeRange[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
              onPress={() => setRange(r)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.rangeBtnText,
                  range === r && styles.rangeBtnTextActive,
                ]}
              >
                {r === '7d' ? '7 Days' : r === '14d' ? '2 Weeks' : '30 Days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="analytics-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No wellness data yet</Text>
            <Text style={styles.emptyDesc}>
              Log your mood, sleep, and habits daily to see trends here.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/add-wellness')}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color={colors.textInverse} />
              <Text style={styles.emptyBtnText}>Log Today</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Mood Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Mood Over Time</Text>
              <View style={styles.chartContainer}>
                {/* Y-axis labels */}
                <View style={styles.yAxis}>
                  {[5, 4, 3, 2, 1].map((v) => (
                    <Text key={v} style={styles.yLabel}>
                      {MOOD_EMOJIS[v]}
                    </Text>
                  ))}
                </View>
                {/* Bars */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.barsContainer}
                >
                  {filtered.map((entry) => {
                    const height = (entry.mood / 5) * 100;
                    return (
                      <View key={entry.id} style={styles.barGroup}>
                        <View style={styles.barWrapper}>
                          <View
                            style={[
                              styles.bar,
                              {
                                height: `${height}%`,
                                backgroundColor: MOOD_COLORS[entry.mood],
                                width: barWidth,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.barLabel}>
                          {format(parseISO(entry.date), 'd')}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Stats Grid */}
            {stats && (
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statEmoji}>
                    {MOOD_EMOJIS[Math.round(stats.avgMood)]}
                  </Text>
                  <Text style={styles.statValue}>
                    {stats.avgMood.toFixed(1)}
                  </Text>
                  <Text style={styles.statLabel}>Avg Mood</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="moon-outline" size={22} color="#8B5CF6" />
                  <Text style={styles.statValue}>
                    {stats.avgSleep.toFixed(1)}h
                  </Text>
                  <Text style={styles.statLabel}>Avg Sleep</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="water-outline" size={22} color="#3B82F6" />
                  <Text style={styles.statValue}>
                    {stats.avgWater.toFixed(1)}
                  </Text>
                  <Text style={styles.statLabel}>Avg Water</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="fitness-outline" size={22} color="#10B981" />
                  <Text style={styles.statValue}>{stats.exerciseRate}%</Text>
                  <Text style={styles.statLabel}>Exercise</Text>
                </View>
              </View>
            )}

            {/* Sleep Trend */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Sleep Hours</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.barsContainer}
              >
                {filtered.map((entry) => {
                  const height = Math.min((entry.sleep / 10) * 100, 100);
                  const sleepColor =
                    entry.sleep >= 7
                      ? '#10B981'
                      : entry.sleep >= 5
                        ? '#F59E0B'
                        : '#EF4444';
                  return (
                    <View key={entry.id} style={styles.barGroup}>
                      <View style={styles.barWrapper}>
                        <View
                          style={[
                            styles.bar,
                            {
                              height: `${height}%`,
                              backgroundColor: sleepColor,
                              width: barWidth,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.barLabel}>
                        {format(parseISO(entry.date), 'd')}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            {/* Insights */}
            <Text style={styles.sectionTitle}>Insights</Text>
            {insights.map((insight, idx) => (
              <View key={idx} style={styles.insightCard}>
                <View
                  style={[
                    styles.insightIcon,
                    { backgroundColor: insight.color + '18' },
                  ]}
                >
                  <Ionicons
                    name={insight.icon as any}
                    size={20}
                    color={insight.color}
                  />
                </View>
                <Text style={styles.insightText}>{insight.text}</Text>
              </View>
            ))}

            {/* Best / Worst Day */}
            {stats && (
              <View style={styles.highlightsRow}>
                <View style={[styles.highlightCard, { borderLeftColor: '#10B981' }]}>
                  <Text style={styles.highlightLabel}>Best Day</Text>
                  <Text style={styles.highlightEmoji}>
                    {MOOD_EMOJIS[stats.bestDay.mood]}
                  </Text>
                  <Text style={styles.highlightDate}>
                    {format(parseISO(stats.bestDay.date), 'MMM d')}
                  </Text>
                </View>
                <View style={[styles.highlightCard, { borderLeftColor: '#EF4444' }]}>
                  <Text style={styles.highlightLabel}>Toughest Day</Text>
                  <Text style={styles.highlightEmoji}>
                    {MOOD_EMOJIS[stats.worstDay.mood]}
                  </Text>
                  <Text style={styles.highlightDate}>
                    {format(parseISO(stats.worstDay.date), 'MMM d')}
                  </Text>
                </View>
              </View>
            )}
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
  headerTitle: { ...typography.headline, color: colors.text, flex: 1, textAlign: 'center' },
  addBtn: {
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
  rangeBtnActive: {
    backgroundColor: colors.primary,
  },
  rangeBtnText: { ...typography.subhead, color: colors.textSecondary },
  rangeBtnTextActive: { color: colors.textInverse },

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
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderRadius: radius.full, marginTop: spacing.sm,
  },
  emptyBtnText: { ...typography.subhead, color: colors.textInverse, fontWeight: '600' },

  // Chart
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  chartTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.md,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 140,
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingRight: spacing.sm,
  },
  yLabel: { fontSize: 14, lineHeight: 20 },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 120,
    paddingBottom: 20,
  },
  barGroup: {
    alignItems: 'center',
  },
  barWrapper: {
    height: 100,
    justifyContent: 'flex-end',
  },
  bar: {
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    ...typography.caption2,
    color: colors.textTertiary,
    marginTop: 4,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%' as any,
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.sm,
  },
  statEmoji: { fontSize: 24 },
  statValue: { ...typography.title3, color: colors.text },
  statLabel: { ...typography.caption1, color: colors.textSecondary },

  // Insights
  sectionTitle: {
    ...typography.title3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  insightIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  insightText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },

  // Highlights
  highlightsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  highlightCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    borderLeftWidth: 3,
    ...shadows.sm,
  },
  highlightLabel: { ...typography.caption1, color: colors.textSecondary },
  highlightEmoji: { fontSize: 28 },
  highlightDate: { ...typography.subhead, color: colors.text },
});
