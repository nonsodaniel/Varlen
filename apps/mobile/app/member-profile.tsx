import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, parseISO } from 'date-fns';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useHouseholdStore } from '../src/stores/householdStore';
import { useCalendarStore } from '../src/stores/calendarStore';
import { useTaskStore } from '../src/stores/taskStore';
import { useAuthStore } from '../src/stores/authStore';
import { Avatar } from '../src/components/ui/Avatar';

export default function MemberProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const { memberId } = useLocalSearchParams<{ memberId?: string }>();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const members = useHouseholdStore((s) => s.members);
  const events = useCalendarStore((s) => s.events);
  const tasks = useTaskStore((s) => s.tasks);

  const member = useMemo(
    () => members.find((m) => m.id === memberId),
    [members, memberId],
  );

  const todayEvents = useMemo(() => {
    if (!member) return [];
    return events
      .filter((e) => e.createdBy === member.id && isToday(parseISO(e.startDate)))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [events, member]);

  const pendingTasks = useMemo(() => {
    if (!member) return [];
    return tasks
      .filter((t) => !t.completed && !t.isChore && t.assignedTo === member.id)
      .slice(0, 8);
  }, [tasks, member]);

  const pendingChores = useMemo(() => {
    if (!member) return [];
    return tasks
      .filter((t) => !t.completed && t.isChore === true && t.assignedTo === member.id)
      .slice(0, 8);
  }, [tasks, member]);

  const isMe = member?.id === currentUserId;

  if (!member) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={[styles.header, { paddingTop: spacing.md }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Member</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Member not found</Text>
        </View>
      </View>
    );
  }

  const roleLabel = member.role.charAt(0).toUpperCase() + member.role.slice(1);

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{member.name}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
          <Avatar name={member.name} size={64} color={member.color ?? colors.primary} />
          <Text style={[styles.heroName, { color: colors.text }]}>{member.name}{isMe ? '  (You)' : ''}</Text>
          <Text style={[styles.heroRole, { color: colors.textSecondary }]}>{roleLabel}</Text>
        </View>

        {/* Today's events */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Events</Text>
        {todayEvents.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
            <Ionicons name="calendar-outline" size={20} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Nothing scheduled today</Text>
          </View>
        ) : (
          <View style={[styles.listCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
            {todayEvents.map((evt, idx) => (
              <TouchableOpacity
                key={evt.id}
                style={[styles.row, idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight }]}
                onPress={() => router.push(`/event/${evt.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.eventDot, { backgroundColor: evt.color ?? colors.primary }]} />
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{evt.title}</Text>
                  <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                    {evt.allDay ? 'All day' : format(parseISO(evt.startDate), 'h:mm a')}
                    {evt.location ? `  ·  ${evt.location}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Pending tasks */}
        {pendingTasks.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Pending Tasks</Text>
            <View style={[styles.listCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
              {pendingTasks.map((task, idx) => (
                <View
                  key={task.id}
                  style={[styles.row, idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight }]}
                >
                  <Ionicons name="ellipse-outline" size={18} color={colors.textTertiary} style={{ marginRight: spacing.sm }} />
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{task.title}</Text>
                    {task.dueDate && (
                      <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                        Due {format(parseISO(task.dueDate), 'MMM d')}
                      </Text>
                    )}
                  </View>
                  {task.priority === 'high' && (
                    <View style={[styles.priorityBadge, { backgroundColor: colors.error + '18' }]}>
                      <Text style={[styles.priorityText, { color: colors.error }]}>High</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Chores */}
        {pendingChores.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Chores</Text>
            <View style={[styles.listCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
              {pendingChores.map((chore, idx) => (
                <View
                  key={chore.id}
                  style={[styles.row, idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight }]}
                >
                  <Ionicons name="construct-outline" size={18} color={colors.warning} style={{ marginRight: spacing.sm }} />
                  <Text style={[styles.rowTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>{chore.title}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {pendingTasks.length === 0 && pendingChores.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, ...shadows.sm, marginTop: -spacing.sm }]}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>All caught up!</Text>
          </View>
        )}

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  backBtn: {
    padding: spacing.sm,
    marginRight: spacing.xs,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 38,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  heroCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  heroName: {
    ...typography.title2,
    marginTop: spacing.md,
  },
  heroRole: {
    ...typography.subhead,
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  sectionTitle: {
    ...typography.title3,
    marginBottom: spacing.sm,
  },
  listCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.md,
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    ...typography.body,
  },
  rowSub: {
    ...typography.footnote,
    marginTop: 2,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.xl,
  },
  emptyText: {
    ...typography.subhead,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  priorityText: {
    ...typography.caption2,
    fontWeight: '600',
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
