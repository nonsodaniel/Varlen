import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, radius, modeThemes } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useModeStore } from '../src/stores/modeStore';
import { useModeHouseholdStore } from '../src/stores/modeHouseholdStore';
import { useFeatureFlagsStore } from '../src/stores/featureFlagsStore';
import { haptics } from '../src/hooks/useHaptics';

const ALL_QUICK_ACTIONS = [
  { icon: 'checkbox-outline' as const, label: 'Task', hint: 'To-dos, chores & reminders', route: '/add-task', flagKey: 'tasks' },
  { icon: 'calendar-outline' as const, label: 'Event', hint: 'Dates, plans & occasions', route: '/add-event', flagKey: 'calendar' },
  { icon: 'card-outline' as const, label: 'Expense', hint: 'Log spending & bills', route: '/add-expense', flagKey: 'expenses' },
  { icon: 'list-outline' as const, label: 'List', hint: 'Shopping & grocery lists', route: '/(tabs)/lists', flagKey: 'shopping' },
  { icon: 'book-outline' as const, label: 'Journal', hint: 'Private thoughts & notes', route: '/add-journal', flagKey: 'journal' },
  { icon: 'camera-outline' as const, label: 'Memory', hint: 'Photos & special moments', route: '/add-memory', flagKey: 'memories' },
];

export default function QuickAddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows, isDark), [colors, shadows, isDark]);
  const { mode } = useModeStore();
  const getModeHousehold = useModeHouseholdStore((s) => s.getModeHousehold);
  const accent = modeThemes[mode].accent;
  const isEnabled = useFeatureFlagsStore((s) => s.isEnabled);
  const quickActions = useMemo(
    () => ALL_QUICK_ACTIONS.filter((a) => isEnabled(a.flagKey)),
    [isEnabled],
  );

  // Animate in
  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(300);

  useEffect(() => {
    backdropOpacity.value = withTiming(1, { duration: 200 });
    sheetTranslateY.value = withSpring(0, { damping: 20, stiffness: 200, mass: 0.8 });
  }, []);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const handleClose = () => {
    backdropOpacity.value = withTiming(0, { duration: 150 });
    sheetTranslateY.value = withTiming(300, { duration: 200, easing: Easing.in(Easing.ease) });
    setTimeout(() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any), 200);
  };

  const handleAction = (route: string) => {
    // Couple mode requires a partner household — redirect to invite if not set up
    if (mode === 'couple' && !getModeHousehold('couple')) {
      handleClose();
      setTimeout(() => router.push('/invite' as any), 250);
      return;
    }
    try { haptics.light(); } catch {}
    handleClose();
    setTimeout(() => {
      try {
        router.push(route as any);
      } catch (e) {
        console.warn('[QuickAdd] Navigation failed:', e);
      }
    }, 250);
  };

  return (
    <View style={styles.container}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, sheetStyle, { paddingBottom: insets.bottom + 16 }]}>
        {/* Handle */}
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Quick Add</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              activeOpacity={0.7}
              onPress={() => handleAction(action.route)}
            >
              <View style={[styles.iconCircle, { backgroundColor: accent + '14' }]}>
                <Ionicons name={action.icon} size={24} color={accent} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionHint}>{action.hint}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: any, shadows: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    ...(isDark ? {
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.border,
    } : {}),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: { elevation: 16 },
    }),
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.headline,
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
    paddingBottom: spacing.lg,
  },
  actionCard: {
    width: '30%',
    backgroundColor: isDark ? colors.elevated : colors.background,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...typography.subhead,
    color: colors.text,
    fontWeight: '600',
  },
  actionHint: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 2,
  },
});
