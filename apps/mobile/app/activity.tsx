import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { colors, typography, spacing, radius, shadows } from '../src/constants/theme';
import { useActivityStore } from '../src/stores/activityStore';
import { getUserName, getUserColor } from '../src/utils/userHelpers';
import { Avatar } from '../src/components/ui/Avatar';

const ACTION_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  expense_added: { icon: 'card-outline', color: '#10B981', bg: '#ECFDF5' },
  expense_settled: { icon: 'checkmark-circle-outline', color: '#3B82F6', bg: '#DBEAFE' },
  task_completed: { icon: 'checkmark-done-outline', color: '#10B981', bg: '#ECFDF5' },
  task_created: { icon: 'add-circle-outline', color: '#8B5CF6', bg: '#EDE9FE' },
  event_created: { icon: 'calendar-outline', color: '#F59E0B', bg: '#FEF3C7' },
  event_updated: { icon: 'create-outline', color: '#F59E0B', bg: '#FEF3C7' },
  list_created: { icon: 'list-outline', color: '#06B6D4', bg: '#CFFAFE' },
  item_added: { icon: 'add-outline', color: '#06B6D4', bg: '#CFFAFE' },
  poll_created: { icon: 'bar-chart-outline', color: '#EC4899', bg: '#FCE7F3' },
  poll_voted: { icon: 'hand-left-outline', color: '#EC4899', bg: '#FCE7F3' },
  memory_added: { icon: 'heart-outline', color: '#EF4444', bg: '#FEE2E2' },
  goal_completed: { icon: 'trophy-outline', color: '#F59E0B', bg: '#FEF3C7' },
  meal_planned: { icon: 'restaurant-outline', color: '#8B5CF6', bg: '#EDE9FE' },
  habit_completed: { icon: 'fitness-outline', color: '#10B981', bg: '#ECFDF5' },
  joined: { icon: 'person-add-outline', color: '#3B82F6', bg: '#DBEAFE' },
};

function getActionConfig(action: string) {
  return ACTION_ICONS[action] ?? { icon: 'pulse-outline', color: '#6B7280', bg: '#F3F4F6' };
}

function formatTimestamp(ts: string): string {
  const date = parseISO(ts);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`;
  return format(date, 'MMM d, h:mm a');
}

function formatDateGroup(ts: string): string {
  const date = parseISO(ts);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMM d');
}

export default function ActivityScreen() {
  const router = useRouter();
  const { items, isLoading, fetchActivity } = useActivityStore();

  useEffect(() => {
    fetchActivity();
  }, []);

  // Group by day
  const groups = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    const result: { label: string; items: typeof sorted }[] = [];
    const map = new Map<string, typeof sorted>();

    for (const item of sorted) {
      const dateKey = item.timestamp.split('T')[0];
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(item);
    }

    for (const [, dayItems] of map) {
      result.push({
        label: formatDateGroup(dayItems[0].timestamp),
        items: dayItems,
      });
    }

    return result;
  }, [items]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchActivity} />
        }
      >
        {items.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="pulse-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptyDesc}>
              Actions by household members will appear here — expenses, tasks, events, and more.
            </Text>
          </View>
        )}

        {groups.map((group) => (
          <View key={group.label} style={styles.dayGroup}>
            <Text style={styles.dayLabel}>{group.label}</Text>

            <View style={styles.timelineContainer}>
              <View style={styles.timelineLine} />

              {group.items.map((item) => {
                const config = getActionConfig(item.action);
                return (
                  <View key={item.id} style={styles.activityRow}>
                    {/* Timeline dot */}
                    <View style={styles.dotColumn}>
                      <View style={[styles.activityDot, { backgroundColor: config.color }]} />
                    </View>

                    {/* Card */}
                    <View style={styles.activityCard}>
                      <View style={styles.activityTop}>
                        <View style={[styles.activityIcon, { backgroundColor: config.bg }]}>
                          <Ionicons name={config.icon as any} size={18} color={config.color} />
                        </View>
                        <View style={styles.activityInfo}>
                          <Text style={styles.activityDetail} numberOfLines={2}>
                            {item.detail}
                          </Text>
                          <Text style={styles.activityTime}>
                            {formatTimestamp(item.timestamp)}
                          </Text>
                        </View>
                        <Avatar
                          name={getUserName(item.userId)}
                          size={28}
                          color={getUserColor(item.userId)}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  headerTitle: { ...typography.headline, color: colors.text },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: spacing['2xl'] },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  emptyTitle: { ...typography.headline, color: colors.text, marginBottom: spacing.xs },
  emptyDesc: {
    ...typography.body, color: colors.textSecondary,
    textAlign: 'center', paddingHorizontal: spacing.lg,
  },

  // Day groups
  dayGroup: { marginBottom: spacing.xl },
  dayLabel: {
    ...typography.subhead,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },

  // Timeline
  timelineContainer: {
    position: 'relative',
    paddingLeft: 24,
  },
  timelineLine: {
    position: 'absolute',
    left: 5,
    top: 6,
    bottom: 6,
    width: 2,
    backgroundColor: colors.borderLight,
    borderRadius: 1,
  },
  activityRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  dotColumn: {
    width: 24,
    alignItems: 'flex-start',
    paddingTop: spacing.lg,
    marginLeft: -24,
  },
  activityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.background,
  },
  activityCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  activityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activityIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  activityInfo: { flex: 1 },
  activityDetail: { ...typography.body, color: colors.text, fontSize: 14 },
  activityTime: { ...typography.caption2, color: colors.textTertiary, marginTop: 2 },
});
