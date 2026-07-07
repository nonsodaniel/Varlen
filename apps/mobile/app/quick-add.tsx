import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '../src/constants/theme';
import { useModeStore } from '../src/stores/modeStore';
import { modeThemes } from '../src/constants/theme';

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
  const { mode } = useModeStore();
  const accent = modeThemes[mode].accent;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Quick Add</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              activeOpacity={0.7}
              onPress={() => {
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  title: {
    ...typography.title2,
    color: colors.text,
  },
  closeBtn: {
    padding: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
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
