import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useModeStore } from '../src/stores/modeStore';
import { modeThemes } from '../src/constants/theme';
import { BottomSheetModalWrapper } from '../src/components/ui/BottomSheetModal';
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
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { mode } = useModeStore();
  const accent = modeThemes[mode].accent;

  return (
    <BottomSheetModalWrapper title="Quick Add" snapPoints={['45%']} scrollable={false}>
      <View style={styles.grid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.actionCard}
            activeOpacity={0.7}
            onPress={() => {
              haptics.light();
              try {
                router.back();
                setTimeout(() => {
                  try {
                    router.push(action.route as any);
                  } catch (e) {
                    console.error('[QuickAdd] Navigation failed:', e);
                  }
                }, 300);
              } catch (e) {
                console.error('[QuickAdd] Navigation failed:', e);
              }
            }}
          >
            <View style={[styles.iconCircle, { backgroundColor: accent + '14' }]}>
              <Ionicons name={action.icon} size={24} color={accent} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </BottomSheetModalWrapper>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  actionCard: {
    width: '30%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
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
