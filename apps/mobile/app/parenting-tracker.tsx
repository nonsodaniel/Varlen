import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useHouseholdStore } from '../src/stores/householdStore';
import { useBabyLogStore } from '../src/stores/babyLogStore';
import { useTaskStore } from '../src/stores/taskStore';
import { Avatar } from '../src/components/ui/Avatar';
import type { Child } from '../src/types';

const EMPTY_CHILDREN: Child[] = [];

const LOG_TYPES = [
  { type: 'feed' as const,      label: 'Feed',      emoji: '🍼', color: '#F59E0B' },
  { type: 'sleep' as const,     label: 'Sleep',     emoji: '😴', color: '#8B5CF6' },
  { type: 'diaper' as const,    label: 'Diaper',    emoji: '🧷', color: '#10B981' },
  { type: 'milestone' as const, label: 'Milestone', emoji: '⭐', color: '#F43F5E' },
  { type: 'health' as const,    label: 'Health',    emoji: '🏥', color: '#3B82F6' },
];

type TabName = 'today' | 'health' | 'tasks';

function timeSince(timestamp: string): string {
  const mins = differenceInMinutes(new Date(), parseISO(timestamp));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m ago` : `${hrs}h ago`;
}

export default function ParentingTrackerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const children = useHouseholdStore((s) => s.household?.children ?? EMPTY_CHILDREN);
  const logs = useBabyLogStore((s) => s.logs);
  const loadLogs = useBabyLogStore((s) => s.loadLogs);
  const deleteLog = useBabyLogStore((s) => s.deleteLog);
  const tasks = useTaskStore((s) => s.tasks);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const toggleTask = useTaskStore((s) => s.toggleTask);

  const { childId: childIdParam } = useLocalSearchParams<{ childId?: string }>();
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabName>('today');
  const scrollViewRef = useRef<ScrollView>(null);

  useFocusEffect(useCallback(() => {
    loadLogs();
    fetchTasks();
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, []));

  useEffect(() => {
    if (children.length > 0) {
      if (childIdParam) {
        const found = children.find((c) => c.id === childIdParam);
        setSelectedChildId(found ? found.id : children[0].id);
      } else if (!selectedChildId) {
        setSelectedChildId(children[0].id);
      }
    }
  }, [children, childIdParam]);

  const child = useMemo(
    () => children.find((c) => c.id === selectedChildId) ?? children[0],
    [children, selectedChildId],
  );

  const today = new Date().toISOString().split('T')[0];

  const todayLogs = useMemo(() => {
    if (!child) return [];
    return logs
      .filter((l) => l.childId === child.id && l.timestamp.startsWith(today))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, child?.id, today]);

  const lastFeed = useMemo(() => todayLogs.find((l) => l.type === 'feed'), [todayLogs]);
  const lastSleep = useMemo(() => todayLogs.find((l) => l.type === 'sleep'), [todayLogs]);
  const lastDiaper = useMemo(() => todayLogs.find((l) => l.type === 'diaper'), [todayLogs]);

  const feedCount = useMemo(() => todayLogs.filter((l) => l.type === 'feed').length, [todayLogs]);
  const sleepCount = useMemo(() => todayLogs.filter((l) => l.type === 'sleep').length, [todayLogs]);
  const diaperCount = useMemo(() => todayLogs.filter((l) => l.type === 'diaper').length, [todayLogs]);
  const totalSleepMins = useMemo(
    () => todayLogs.filter((l) => l.type === 'sleep' && l.duration != null).reduce((s, l) => s + (l.duration ?? 0), 0),
    [todayLogs],
  );

  const milestones = useMemo(() => {
    if (!child) return [];
    return logs
      .filter((l) => l.childId === child.id && l.type === 'milestone')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [logs, child?.id]);

  const healthLogs = useMemo(() => {
    if (!child) return [];
    return logs
      .filter((l) => l.childId === child.id && l.type === 'health')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, child?.id]);

  const childTasks = useMemo(() => {
    if (!child) return [];
    return tasks
      .filter((t) => t.assignedTo === child.id)
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return new Date(a.dueDate ?? '').getTime() - new Date(b.dueDate ?? '').getTime();
      });
  }, [tasks, child?.id]);

  const navigateToLog = (type: string) => {
    router.push(`/log-baby?type=${type}&childId=${child?.id ?? ''}` as any);
  };

  if (children.length === 0) {
    return (
      <View style={styles.safe}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kids Tracker</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyFull}>
          <Text style={styles.emptyFullEmoji}>👶</Text>
          <Text style={styles.emptyFullTitle}>No children added yet</Text>
          <Text style={styles.emptyFullDesc}>
            Add children to your household to start tracking feeds, sleep, and milestones.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kids Tracker</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigateToLog('feed')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Child selector tabs */}
      <ScrollView keyboardDismissMode="on-drag"
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.childTabsWrap, { backgroundColor: colors.surface }]}
        contentContainerStyle={styles.childTabs}
      >
        {children.map((c) => {
          const isActive = c.id === selectedChildId;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.childTab, isActive && { borderBottomColor: c.color, borderBottomWidth: 2 }]}
              onPress={() => setSelectedChildId(c.id)}
              activeOpacity={0.7}
            >
              <Avatar name={c.name} size={28} color={c.color} />
              <Text style={[styles.childTabName, isActive && { color: c.color, fontWeight: '700' }]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        {([
          { key: 'today', label: 'Today' },
          { key: 'health', label: 'Health' },
          { key: 'tasks', label: 'Tasks' },
        ] as { key: TabName; label: string }[]).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, { color: activeTab === tab.key ? colors.primary : colors.textSecondary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView keyboardDismissMode="on-drag"
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'today' && (
          <>
            {/* Today's stats — tap to quick-log */}
            <View style={styles.statsRow}>
              <TouchableOpacity
                style={[styles.statCard, shadows.sm, { backgroundColor: colors.surface }]}
                onPress={() => navigateToLog('feed')}
                activeOpacity={0.75}
              >
                <Text style={styles.statEmoji}>🍼</Text>
                <Text style={[styles.statCount, { color: colors.text }]}>{feedCount}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>feeds</Text>
                {lastFeed ? (
                  <Text style={[styles.statSince, { color: '#F59E0B' }]}>{timeSince(lastFeed.timestamp)}</Text>
                ) : (
                  <Text style={[styles.statSince, { color: colors.textTertiary }]}>+ log feed</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statCard, shadows.sm, { backgroundColor: colors.surface }]}
                onPress={() => navigateToLog('sleep')}
                activeOpacity={0.75}
              >
                <Text style={styles.statEmoji}>😴</Text>
                <Text style={[styles.statCount, { color: colors.text }]}>{sleepCount}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>sleeps</Text>
                {totalSleepMins > 0 ? (
                  <Text style={[styles.statSince, { color: '#8B5CF6' }]}>
                    {`${Math.floor(totalSleepMins / 60)}h ${totalSleepMins % 60}m`}
                  </Text>
                ) : lastSleep ? (
                  <Text style={[styles.statSince, { color: '#8B5CF6' }]}>{timeSince(lastSleep.timestamp)}</Text>
                ) : (
                  <Text style={[styles.statSince, { color: colors.textTertiary }]}>+ log sleep</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statCard, shadows.sm, { backgroundColor: colors.surface }]}
                onPress={() => navigateToLog('diaper')}
                activeOpacity={0.75}
              >
                <Text style={styles.statEmoji}>🧷</Text>
                <Text style={[styles.statCount, { color: colors.text }]}>{diaperCount}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>diapers</Text>
                {lastDiaper ? (
                  <Text style={[styles.statSince, { color: '#10B981' }]}>{timeSince(lastDiaper.timestamp)}</Text>
                ) : (
                  <Text style={[styles.statSince, { color: colors.textTertiary }]}>+ log diaper</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Quick log buttons */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Log Activity</Text>
            <View style={styles.quickLogGrid}>
              {LOG_TYPES.map((lt) => (
                <TouchableOpacity
                  key={lt.type}
                  style={[styles.quickLogBtn, shadows.sm, { backgroundColor: colors.surface }]}
                  onPress={() => navigateToLog(lt.type)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.quickLogEmoji}>{lt.emoji}</Text>
                  <Text style={[styles.quickLogLabel, { color: colors.textSecondary }]}>{lt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Today's timeline */}
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Log</Text>
              {todayLogs.length > 0 && (
                <Text style={[styles.sectionCount, { color: colors.textTertiary }]}>{todayLogs.length} entries</Text>
              )}
            </View>
            {todayLogs.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
                <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>No logs yet today</Text>
                <Text style={[styles.emptyCardSub, { color: colors.textTertiary }]}>Tap a button above to start tracking</Text>
              </View>
            ) : (
              todayLogs.map((log) => {
                const lt = LOG_TYPES.find((t) => t.type === log.type);
                return (
                  <View key={log.id} style={[styles.logEntry, shadows.sm, { backgroundColor: colors.surface }]}>
                    <Text style={styles.logEntryEmoji}>{lt?.emoji ?? '📋'}</Text>
                    <View style={styles.logEntryInfo}>
                      <Text style={[styles.logEntryType, { color: colors.text }]}>{lt?.label ?? log.type}</Text>
                      {log.duration != null && (
                        <Text style={[styles.logEntryMeta, { color: colors.textSecondary }]}>{log.duration} min</Text>
                      )}
                      {log.note ? (
                        <Text style={[styles.logEntryNote, { color: colors.textTertiary }]} numberOfLines={2}>{log.note}</Text>
                      ) : null}
                    </View>
                    <Text style={[styles.logEntryTime, { color: colors.primary }]}>
                      {format(parseISO(log.timestamp), 'h:mm a')}
                    </Text>
                    <TouchableOpacity
                      style={styles.logDeleteBtn}
                      onPress={() => deleteLog(log.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}

            {/* Milestones */}
            {milestones.length > 0 && (
              <>
                <View style={[styles.sectionRow, { marginTop: spacing.xl }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Milestones</Text>
                </View>
                {milestones.map((m) => (
                  <View key={m.id} style={[styles.milestoneEntry, shadows.sm, { backgroundColor: colors.surface }]}>
                    <Text style={styles.milestoneEmoji}>⭐</Text>
                    <View style={styles.milestoneInfo}>
                      <Text style={[styles.milestoneTitle, { color: colors.text }]} numberOfLines={2}>{m.note}</Text>
                      <Text style={[styles.milestoneDate, { color: colors.textTertiary }]}>
                        {format(parseISO(m.timestamp), 'MMM d, yyyy')}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {activeTab === 'health' && (
          <>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Health Records</Text>
              <TouchableOpacity
                onPress={() => navigateToLog('health')}
                activeOpacity={0.7}
                style={[styles.addInlineBtn, { backgroundColor: colors.primaryLight }]}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={[styles.addInlineBtnText, { color: colors.primary }]}>Add</Text>
              </TouchableOpacity>
            </View>
            {healthLogs.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
                <Text style={styles.emptyCardEmoji}>🏥</Text>
                <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>No health records yet</Text>
                <Text style={[styles.emptyCardSub, { color: colors.textTertiary }]}>
                  Log vaccines, doctor visits, medications, weight — anything health related
                </Text>
                <TouchableOpacity
                  style={[styles.emptyCardBtn, { backgroundColor: colors.primary }]}
                  onPress={() => navigateToLog('health')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emptyCardBtnText}>Log health record</Text>
                </TouchableOpacity>
              </View>
            ) : (
              healthLogs.map((log) => (
                <View key={log.id} style={[styles.logEntry, shadows.sm, { backgroundColor: colors.surface }]}>
                  <Text style={styles.logEntryEmoji}>🏥</Text>
                  <View style={styles.logEntryInfo}>
                    <Text style={[styles.logEntryType, { color: colors.text }]} numberOfLines={1}>{log.note ?? 'Health record'}</Text>
                    <Text style={[styles.logEntryMeta, { color: colors.textTertiary }]}>
                      {format(parseISO(log.timestamp), 'MMM d, yyyy · h:mm a')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.logDeleteBtn}
                    onPress={() => deleteLog(log.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}

        {activeTab === 'tasks' && (
          <>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{child?.name}'s Tasks</Text>
              <TouchableOpacity
                onPress={() => router.push(`/add-task?childId=${child?.id ?? ''}&childName=${encodeURIComponent(child?.name ?? '')}` as any)}
                activeOpacity={0.7}
                style={[styles.addInlineBtn, { backgroundColor: colors.primaryLight }]}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={[styles.addInlineBtnText, { color: colors.primary }]}>Add</Text>
              </TouchableOpacity>
            </View>
            {childTasks.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
                <Text style={styles.emptyCardEmoji}>✅</Text>
                <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>No tasks for {child?.name}</Text>
                <Text style={[styles.emptyCardSub, { color: colors.textTertiary }]}>
                  Add school assignments, chores, or reminders just for {child?.name}
                </Text>
                <TouchableOpacity
                  style={[styles.emptyCardBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push(`/add-task?childId=${child?.id ?? ''}&childName=${encodeURIComponent(child?.name ?? '')}` as any)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emptyCardBtnText}>Add a task</Text>
                </TouchableOpacity>
              </View>
            ) : (
              childTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskEntry, shadows.sm, { backgroundColor: colors.surface }]}
                  onPress={() => toggleTask(task.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.taskCheck,
                    { borderColor: task.completed ? colors.success : colors.border },
                    task.completed && { backgroundColor: colors.success },
                  ]}>
                    {task.completed && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <View style={styles.taskInfo}>
                    <Text style={[styles.taskTitle, { color: colors.text }, task.completed && { color: colors.textTertiary, textDecorationLine: 'line-through' }]}>
                      {task.title}
                    </Text>
                    {task.dueDate && (
                      <Text style={[styles.taskMeta, { color: colors.textTertiary }]}>
                        Due {format(new Date(task.dueDate), 'MMM d')}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.taskPriorityDot, {
                    backgroundColor: task.priority === 'high' ? '#EF4444' : task.priority === 'medium' ? '#F59E0B' : '#10B981',
                  }]} />
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...typography.headline, color: colors.text, flex: 1, textAlign: 'center' },
  headerSpacer: { width: 36 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },

  // Child tabs
  childTabsWrap: { maxHeight: 72, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  childTabs: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, gap: spacing.xs },
  childTab: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  childTabName: { ...typography.subhead, color: colors.textSecondary },

  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },

  // Stats
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  statCard: {
    flex: 1, alignItems: 'center', borderRadius: radius.lg,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xs,
  },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statCount: { ...typography.title3, fontWeight: '800' },
  statLabel: { ...typography.caption2, marginTop: 1 },
  statSince: { ...typography.caption2, fontWeight: '600', marginTop: 4, textAlign: 'center' },

  // Section headers
  sectionTitle: { ...typography.headline, marginBottom: spacing.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sectionCount: { ...typography.caption1 },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabLabel: { ...typography.subhead, fontWeight: '600' },

  // Quick log grid (2-row wrap)
  quickLogGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  quickLogBtn: {
    width: '18%', minWidth: 60, alignItems: 'center',
    paddingVertical: spacing.md, borderRadius: radius.lg,
  },
  quickLogEmoji: { fontSize: 22, marginBottom: 4 },
  quickLogLabel: { ...typography.caption1, fontWeight: '600' },

  // Inline add button
  addInlineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  addInlineBtnText: { ...typography.caption1, fontWeight: '700' },

  // Empty states
  emptyCard: {
    alignItems: 'center', borderRadius: radius.lg,
    paddingVertical: spacing.xl, marginBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  emptyCardEmoji: { fontSize: 36, marginBottom: spacing.sm },
  emptyCardText: { ...typography.subhead, fontWeight: '600', marginBottom: spacing.xs },
  emptyCardSub: { ...typography.caption1, textAlign: 'center', marginBottom: spacing.lg },
  emptyCardBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.full },
  emptyCardBtnText: { ...typography.subhead, color: '#fff', fontWeight: '700' },
  emptyFull: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  emptyFullEmoji: { fontSize: 48, marginBottom: spacing.lg },
  emptyFullTitle: { ...typography.title3, color: colors.text, marginBottom: spacing.sm, textAlign: 'center' },
  emptyFullDesc: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

  // Log entries
  logEntry: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm,
  },
  logEntryEmoji: { fontSize: 22, width: 32, textAlign: 'center' },
  logEntryInfo: { flex: 1 },
  logEntryType: { ...typography.subhead, fontWeight: '700' },
  logEntryMeta: { ...typography.caption1, marginTop: 2 },
  logEntryNote: { ...typography.caption1, marginTop: 2 },
  logEntryTime: { ...typography.caption1, fontWeight: '600' },
  logDeleteBtn: { padding: 4, marginLeft: 4 },

  // Tasks
  taskEntry: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm,
  },
  taskCheck: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  taskInfo: { flex: 1 },
  taskTitle: { ...typography.body, fontWeight: '600' },
  taskMeta: { ...typography.caption1, marginTop: 2 },
  taskPriorityDot: { width: 8, height: 8, borderRadius: 4 },

  // Milestones
  milestoneEntry: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm,
  },
  milestoneEmoji: { fontSize: 22 },
  milestoneInfo: { flex: 1 },
  milestoneTitle: { ...typography.body, fontWeight: '600' },
  milestoneDate: { ...typography.caption2, marginTop: 2 },
});
