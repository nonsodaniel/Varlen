import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { adaptTintColor } from '../src/utils/tintColors';
import { AnimatedCardEntrance } from '../src/components/AnimatedCardEntrance';
import { PressableScale } from '../src/components/PressableScale';
import { useFocusEffect } from '@react-navigation/native';
import { useWeeklyRecap } from '../src/hooks/useWeeklyRecap';
import { usePremiumGate } from '../src/hooks/usePremiumGate';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.xl * 2 - spacing.md) / 2;

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  color: string;
  bg: string;
  index: number;
  colors: any;
  shadows: any;
  isDark?: boolean;
}

function StatCard({ icon, label, value, color, bg, index, colors, shadows, isDark }: StatCardProps) {
  const statStyles = useMemo(() => createStatStyles(colors, shadows), [colors, shadows]);
  const adaptedBg = adaptTintColor(bg, !!isDark);
  return (
    <AnimatedCardEntrance index={index} style={{ width: CARD_WIDTH }}>
      <View style={statStyles.card}>
        <LinearGradient
          colors={[adaptedBg, colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={statStyles.gradient}
        />
        <View style={[statStyles.iconWrap, { backgroundColor: adaptedBg }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <Text style={statStyles.value}>{value}</Text>
        <Text style={statStyles.label}>{label}</Text>
      </View>
    </AnimatedCardEntrance>
  );
}

const createStatStyles = (colors: any, shadows: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
    ...shadows.soft,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  value: {
    ...typography.title2,
    color: colors.text,
    fontWeight: '700',
  },
  label: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default function WeeklyRecapScreen() {
  const router = useRouter();
  const { colors, shadows, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { requirePremium } = usePremiumGate();
  const recap = useWeeklyRecap();

  useFocusEffect(useCallback(() => { requirePremium('weekly_recap'); }, [requirePremium]));

  const stats: Omit<StatCardProps, 'colors' | 'shadows'>[] = [
    {
      icon: 'checkmark-done-outline',
      label: 'Tasks Completed',
      value: String(recap.tasksCompleted),
      color: '#10B981',
      bg: '#ECFDF5',
      index: 0,
    },
    {
      icon: 'card-outline',
      label: 'Total Spent',
      value: `${recap.currencySymbol}${Math.round(recap.expensesTotal).toLocaleString()}`,
      color: '#3B82F6',
      bg: '#DBEAFE',
      index: 1,
    },
    {
      icon: 'repeat-outline',
      label: 'Habit Rate',
      value: `${recap.habitsCompletionRate}%`,
      color: '#8B5CF6',
      bg: '#EDE9FE',
      index: 2,
    },
    {
      icon: 'restaurant-outline',
      label: 'Meals Planned',
      value: String(recap.mealsPlanCount),
      color: '#F97316',
      bg: '#FFF7ED',
      index: 3,
    },
    {
      icon: 'calendar-outline',
      label: 'Events',
      value: String(recap.eventsCount),
      color: '#6366F1',
      bg: '#EEF2FF',
      index: 4,
    },
    {
      icon: 'happy-outline',
      label: 'Avg Mood',
      value: recap.wellnessAvgMood > 0 ? String(recap.wellnessAvgMood) : '-',
      color: '#EC4899',
      bg: '#FCE7F3',
      index: 5,
    },
    {
      icon: 'flame-outline',
      label: 'App Streak',
      value: `${recap.streakDays}d`,
      color: '#F59E0B',
      bg: '#FEF3C7',
      index: 6,
    },
    ...(recap.topCategory
      ? [{
          icon: 'pie-chart-outline' as string,
          label: 'Top Spend',
          value: recap.topCategory.charAt(0).toUpperCase() + recap.topCategory.slice(1),
          color: '#EF4444',
          bg: '#FEE2E2',
          index: 7,
        }]
      : []),
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </PressableScale>
        <Text style={styles.headerTitle}>Weekly Recap</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <AnimatedCardEntrance index={0}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Ionicons name="bar-chart-outline" size={28} color="rgba(255,255,255,0.8)" />
            <Text style={styles.heroTitle}>Your Week in Review</Text>
            <Text style={styles.heroDate}>{recap.weekLabel}</Text>
          </LinearGradient>
        </AnimatedCardEntrance>

        {/* Stats Grid */}
        <View style={styles.grid}>
          {stats.map((s) => (
            <StatCard key={s.label} {...s} colors={colors} shadows={shadows} isDark={isDark} />
          ))}
        </View>

        {/* Highlights */}
        {recap.highlights.length > 0 && (
          <AnimatedCardEntrance index={8}>
            <View style={styles.highlightsCard}>
              <View style={styles.highlightsHeader}>
                <Ionicons name="sparkles" size={16} color="#F59E0B" />
                <Text style={styles.highlightsTitle}>Highlights</Text>
              </View>
              {recap.highlights.map((h, i) => (
                <View key={i} style={styles.highlightRow}>
                  <View style={styles.highlightDot} />
                  <Text style={styles.highlightText}>{h}</Text>
                </View>
              ))}
            </View>
          </AnimatedCardEntrance>
        )}

        {/* Done button */}
        <AnimatedCardEntrance index={9}>
          <PressableScale onPress={() => router.back()} style={styles.doneBtn}>
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.doneBtnGradient}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </LinearGradient>
          </PressableScale>
        </AnimatedCardEntrance>

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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typography.headline, color: colors.text },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heroTitle: {
    ...typography.title2,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  heroDate: {
    ...typography.subhead,
    color: 'rgba(255,255,255,0.75)',
    marginTop: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  highlightsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.soft,
  },
  highlightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  highlightsTitle: {
    ...typography.headline,
    color: colors.text,
    fontSize: 15,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  highlightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  highlightText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  doneBtn: {
    alignSelf: 'center',
  },
  doneBtnGradient: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: radius.full,
  },
  doneBtnText: {
    ...typography.headline,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
});
