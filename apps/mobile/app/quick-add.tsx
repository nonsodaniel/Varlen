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
import { haptics } from '../src/hooks/useHaptics';

const quickActions = [
  { icon: 'checkbox-outline' as const, label: 'Task', route: '/add-task' },
  { icon: 'calendar-outline' as const, label: 'Event', route: '/add-event' },
  { icon: 'card-outline' as const, label: 'Expense', route: '/add-expense' },
  { icon: 'list-outline' as const, label: 'List', route: '/(tabs)/lists' },
  { icon: 'book-outline' as const, label: 'Journal', route: '/add-journal' },
  { icon: 'camera-outline' as const, label: 'Memory', route: '/add-memory' },
];

export default function QuickAddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows, isDark), [colors, shadows, isDark]);
  const { mode } = useModeStore();
  const accent = modeThemes[mode].accent;

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
});
