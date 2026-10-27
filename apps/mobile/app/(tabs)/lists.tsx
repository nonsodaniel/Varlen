import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Keyboard, Alert, InteractionManager, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { format, subDays, isToday, isYesterday } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeIn, useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, withSpring, withTiming, withSequence, withDelay, Easing } from 'react-native-reanimated';
import { colors, typography, spacing, radius, categoryColors } from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { adaptTintColor } from '../../src/utils/tintColors';
import { Avatar } from '../../src/components/ui/Avatar';
import { PressableScale } from '../../src/components/PressableScale';
import { AnimatedCardEntrance } from '../../src/components/AnimatedCardEntrance';
import { ConfettiBurst } from '../../src/components/ConfettiBurst';
import { useListStore } from '../../src/stores/listStore';
import { useTaskStore } from '../../src/stores/taskStore';
import { useExpenseStore } from '../../src/stores/expenseStore';
import { useHabitStore } from '../../src/stores/habitStore';
import { getUserName, getUserColor } from '../../src/utils/userHelpers';
import { useAuthStore } from '../../src/stores/authStore';
import { useModeStore } from '../../src/stores/modeStore';
import { useBudgetStore } from '../../src/stores/budgetStore';
import { useAlert } from '../../src/components/AlertProvider';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useFeatureFlagsStore } from '../../src/stores/featureFlagsStore';
import { haptics } from '../../src/hooks/useHaptics';

type LifeSpace = 'tasks' | 'shopping' | 'money' | 'routines';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = spacing.md;
const GRID_PADDING = spacing.xl;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

const SPACE_ACCENTS = {
  tasks: { color: categoryColors.household.icon, bg: categoryColors.household.bg },
  shopping: { color: categoryColors.groceries.icon, bg: categoryColors.groceries.bg },
  money: { color: colors.primary, bg: colors.primaryLight },
  routines: { color: categoryColors.transport.icon, bg: categoryColors.transport.bg },
} as const;

function hasContent(space: LifeSpace, tasks: any[], lists: any[], expenses: any[], budgets: any[], habits: any[]) {
  switch (space) {
    case 'tasks': return tasks.length > 0;
    case 'shopping': return lists.length > 0;
    case 'money': return expenses.length > 0 || budgets.length > 0;
    case 'routines': return habits.length > 0;
  }
}

const HABIT_COLORS = [
  { gradient: ['#3B82F6', '#2563EB'] as const, bg: '#EFF6FF' },
  { gradient: ['#10B981', '#059669'] as const, bg: '#D1FAE5' },
  { gradient: ['#F59E0B', '#D97706'] as const, bg: '#FEF3C7' },
  { gradient: ['#8B5CF6', '#7C3AED'] as const, bg: '#EDE9FE' },
  { gradient: ['#EC4899', '#DB2777'] as const, bg: '#FCE7F3' },
  { gradient: ['#EF4444', '#DC2626'] as const, bg: '#FEE2E2' },
];

const HABIT_EMOJIS = ['🏃', '📖', '💧', '🧘', '✍️', '🎯', '💪', '🧠', '🌅', '😴', '🥗', '🎨'];

const FREQUENCY_OPTIONS = [
  { label: 'Daily', value: 'daily' as const },
  { label: 'Weekly', value: 'weekly' as const },
];

export default function ListsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const habitStyles = useMemo(() => createHabitStyles(colors, shadows), [colors, shadows]);
  const params = useLocalSearchParams<{ section?: string }>();
  const isEnabled = useFeatureFlagsStore((s) => s.isEnabled);
  const tasksEnabled = isEnabled('tasks');
  const shoppingEnabled = isEnabled('shopping');
  const expensesEnabled = isEnabled('expenses');
  const routinesEnabled = isEnabled('routines');

  const [activeSpace, setActiveSpace] = useState<LifeSpace>(() => {
    if (isEnabled('tasks')) return 'tasks';
    if (isEnabled('shopping')) return 'shopping';
    if (isEnabled('expenses')) return 'money';
    if (isEnabled('routines')) return 'routines';
    return 'tasks';
  });

  // If the active space gets disabled, switch to first available
  useEffect(() => {
    const currentOk =
      (activeSpace === 'tasks' && tasksEnabled) ||
      (activeSpace === 'shopping' && shoppingEnabled) ||
      (activeSpace === 'money' && expensesEnabled) ||
      (activeSpace === 'routines' && routinesEnabled);
    if (!currentOk) {
      if (tasksEnabled) setActiveSpace('tasks');
      else if (shoppingEnabled) setActiveSpace('shopping');
      else if (expensesEnabled) setActiveSpace('money');
      else if (routinesEnabled) setActiveSpace('routines');
    }
  }, [tasksEnabled, shoppingEnabled, expensesEnabled, routinesEnabled]);

  const { mode: listScreenMode } = useModeStore();
  const scrollRef = useRef<any>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [listScreenMode]);

  const tasks = useTaskStore((s) => s.tasks);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const lists = useListStore((s) => s.lists);
  const addList = useListStore((s) => s.addList);
  const fetchLists = useListStore((s) => s.fetchLists);
  const expenses = useExpenseStore((s) => s.expenses);
  const getBalance = useExpenseStore((s) => s.getBalance);
  const fetchExpenses = useExpenseStore((s) => s.fetchExpenses);
  const budgets = useBudgetStore((s) => s.budgets);
  const fetchBudgets = useBudgetStore((s) => s.fetchBudgets);
  const habits = useHabitStore((s) => s.habits);
  const fetchHabits = useHabitStore((s) => s.fetchHabits);
  const isCompletedToday = useHabitStore((s) => s.isCompletedToday);
  const user = useAuthStore((s) => s.user);
  const { showAlert } = useAlert();
  const cs = useSettingsStore((s) => s.currencySymbol) || '$';
  const [refreshing, setRefreshing] = useState(false);

  const listScrollY = useSharedValue(0);
  const onListScroll = useAnimatedScrollHandler((e) => {
    listScrollY.value = e.contentOffset.y;
  });
  const compactHeaderStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, listScrollY.value / 50)),
  }));

  const refreshAllData = useCallback(async () => {
    await Promise.allSettled([fetchTasks(), fetchLists(), fetchExpenses(), fetchBudgets(), fetchHabits()]);
  }, [fetchTasks, fetchLists, fetchExpenses, fetchBudgets, fetchHabits]);

  useFocusEffect(useCallback(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      refreshAllData();
    });
    return () => task.cancel();
  }, [refreshAllData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAllData();
    setRefreshing(false);
  }, [refreshAllData]);

  // Allow deep-linking to a specific section via ?section=shopping
  useEffect(() => {
    const s = params.section as LifeSpace | undefined;
    if (!s || !['tasks', 'shopping', 'money', 'routines'].includes(s)) return;
    const flagMap: Record<LifeSpace, string> = { tasks: 'tasks', shopping: 'shopping', money: 'expenses', routines: 'routines' };
    if (isEnabled(flagMap[s])) setActiveSpace(s);
  }, [params.section]);

  const pendingTasks = tasks.filter(t => !t.completed).length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const taskProgress = totalTasks > 0 ? completedTasks / totalTasks : 0;

  const totalItems = lists.reduce((sum, l) => sum + l.items.length, 0);
  const listNames = lists.map(l => l.name).join(', ');

  const balance = useMemo(() => getBalance(), [expenses]);
  const unsettledCount = useMemo(() => expenses.filter(e => !e.settled).length, [expenses]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayRoutineCount = habits.filter(h => h.completedDates.includes(todayStr)).length;
  const habitsWithStreaks = habits.filter(h => h.streak > 0).length;

  const handleAdd = useCallback(async (space: LifeSpace) => {
    switch (space) {
      case 'tasks':
        router.push('/add-task');
        break;
      case 'shopping': {
        try {
          const newId = await addList({ name: 'New List', shared: true, createdBy: user?.id ?? '' });
          router.push(`/list/${newId}`);
        } catch {
          showAlert('Error', 'Could not create list. Please try again.');
        }
        break;
      }
      case 'money':
        router.push('/add-expense');
        break;
      case 'routines':
        // Handled by RoutinesContent's own add modal
        break;
    }
  }, [router, user, addList, showAlert]);

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onListScroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: spacing.md }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.screenTitle}>Life</Text>
            <Text style={styles.screenSubtitle}>Manage your daily essentials</Text>
          </View>
          {hasContent(activeSpace, tasks, lists, expenses, budgets, habits) && (
            <TouchableOpacity
              style={styles.headerAddBtn}
              activeOpacity={0.7}
              onPress={() => handleAdd(activeSpace)}
            >
              <Ionicons name="add" size={22} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Life Spaces Grid */}
        <View style={styles.grid}>
          {/* Row 1 */}
          {(tasksEnabled || shoppingEnabled) && (
            <View style={styles.gridRow}>
              {/* Tasks Card */}
              {tasksEnabled && (
                <TouchableOpacity
                  style={[
                    styles.spaceCard,
                    activeSpace === 'tasks' && styles.spaceCardActive,
                    activeSpace === 'tasks' && { borderColor: SPACE_ACCENTS.tasks.color },
                  ]}
                  onPress={() => setActiveSpace('tasks')}
                  activeOpacity={0.7}
                >
                  <View style={styles.spaceCardInner}>
                    <View style={[styles.spaceIconWrap, { backgroundColor: SPACE_ACCENTS.tasks.bg }]}>
                      <Ionicons name="checkmark-circle-outline" size={22} color={SPACE_ACCENTS.tasks.color} />
                    </View>
                    <Text style={styles.spaceTitle}>Tasks</Text>
                    <Text style={styles.spaceStat}>{pendingTasks > 0 ? `${pendingTasks} pending` : 'Tap to manage tasks'}</Text>
                    <View style={styles.spaceProgressTrack}>
                      <View
                        style={[
                          styles.spaceProgressFill,
                          {
                            width: `${Math.round(taskProgress * 100)}%`,
                            backgroundColor: SPACE_ACCENTS.tasks.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {/* Shopping Card */}
              {shoppingEnabled && (
                <TouchableOpacity
                  style={[
                    styles.spaceCard,
                    activeSpace === 'shopping' && styles.spaceCardActive,
                    activeSpace === 'shopping' && { borderColor: SPACE_ACCENTS.shopping.color },
                  ]}
                  onPress={() => setActiveSpace('shopping')}
                  activeOpacity={0.7}
                >
                  <View style={styles.spaceCardInner}>
                    <View style={[styles.spaceIconWrap, { backgroundColor: SPACE_ACCENTS.shopping.bg }]}>
                      <Ionicons name="cart-outline" size={22} color={SPACE_ACCENTS.shopping.color} />
                    </View>
                    <Text style={styles.spaceTitle}>Shopping</Text>
                    <Text style={styles.spaceStat}>{lists.length > 0 ? `${lists.length} lists · ${totalItems} items` : 'Tap to create lists'}</Text>
                    {listNames ? <Text style={styles.spaceSubtext} numberOfLines={1}>{listNames}</Text> : null}
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Row 2 */}
          {(expensesEnabled || routinesEnabled) && (
            <View style={styles.gridRow}>
              {/* Money Card */}
              {expensesEnabled && (
                <TouchableOpacity
                  style={[
                    styles.spaceCard,
                    activeSpace === 'money' && styles.spaceCardActive,
                    activeSpace === 'money' && { borderColor: SPACE_ACCENTS.money.color },
                  ]}
                  onPress={() => setActiveSpace('money')}
                  activeOpacity={0.7}
                >
                  <View style={styles.spaceCardInner}>
                    <View style={[styles.spaceIconWrap, { backgroundColor: SPACE_ACCENTS.money.bg }]}>
                      <Ionicons name="wallet-outline" size={22} color={SPACE_ACCENTS.money.color} />
                    </View>
                    <Text style={styles.spaceTitle}>Money</Text>
                    {expenses.length > 0 ? (
                      <>
                        <Text style={[styles.spaceStatHighlight, { color: balance.net >= 0 ? colors.success : colors.error }]}>
                          {balance.net >= 0 ? '+' : '-'}{cs}{Math.abs(balance.net).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                        <Text style={styles.spaceSubtext}>{unsettledCount} unsettled</Text>
                      </>
                    ) : (
                      <Text style={styles.spaceStat}>Tap to track expenses</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}

              {/* Routines Card */}
              {routinesEnabled && (
                <TouchableOpacity
                  style={[
                    styles.spaceCard,
                    activeSpace === 'routines' && styles.spaceCardActive,
                    activeSpace === 'routines' && { borderColor: SPACE_ACCENTS.routines.color },
                  ]}
                  onPress={() => setActiveSpace('routines')}
                  activeOpacity={0.7}
                >
                  <View style={styles.spaceCardInner}>
                    <View style={[styles.spaceIconWrap, { backgroundColor: SPACE_ACCENTS.routines.bg }]}>
                      <Ionicons name="repeat-outline" size={22} color={SPACE_ACCENTS.routines.color} />
                    </View>
                    <Text style={styles.spaceTitle}>Routines</Text>
                    <Text style={styles.spaceStat}>
                      {habits.length > 0
                        ? `${todayRoutineCount}/${habits.length} done today`
                        : 'Tap to build habits'}
                    </Text>
                    {habitsWithStreaks > 0 && (
                      <Text style={styles.spaceSubtext}>🔥 {habitsWithStreaks} streak{habitsWithStreaks > 1 ? 's' : ''} active</Text>
                    )}
                    {habits.length > 0 && (
                      <View style={styles.spaceProgressTrack}>
                        <View
                          style={[
                            styles.spaceProgressFill,
                            {
                              width: `${Math.round((todayRoutineCount / habits.length) * 100)}%`,
                              backgroundColor: SPACE_ACCENTS.routines.color,
                            },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Active Content Area */}
        <View style={styles.contentArea}>
          {!tasksEnabled && !shoppingEnabled && !expensesEnabled && !routinesEnabled ? (
            <View style={styles.emptyCard}>
              <Ionicons name="lock-closed-outline" size={32} color={colors.textTertiary} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>No features available</Text>
              <Text style={styles.emptyHint}>All Life spaces are currently disabled by your administrator.</Text>
            </View>
          ) : (
            <>
              <ContentSectionHeader
                activeSpace={activeSpace}
                hasContent={
                  (activeSpace === 'tasks' && tasks.length > 0) ||
                  (activeSpace === 'shopping' && lists.length > 0) ||
                  (activeSpace === 'money' && (expenses.length > 0 || budgets.length > 0)) ||
                  (activeSpace === 'routines' && habits.length > 0)
                }
              />
              {activeSpace === 'tasks' && tasksEnabled && <TasksContent />}
              {activeSpace === 'shopping' && shoppingEnabled && <ShoppingContent />}
              {activeSpace === 'money' && expensesEnabled && <MoneyContent />}
              {activeSpace === 'routines' && routinesEnabled && <RoutinesContent />}
            </>
          )}
        </View>

        <View style={{ height: 200 }} />
      </Animated.ScrollView>
      <Animated.View
        pointerEvents="none"
        style={[styles.compactHeader, { height: insets.top }, compactHeaderStyle]}
      >
        <Text style={styles.compactHeaderTitle}>Life</Text>
        <View style={styles.compactHeaderBorder} />
      </Animated.View>
    </View>
  );
}

// ─── CONTENT SECTION HEADER ──────────────────────────────

function ContentSectionHeader({ activeSpace, hasContent }: { activeSpace: LifeSpace; hasContent: boolean }) {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const titles: Record<LifeSpace, string> = {
    tasks: 'Your tasks & to-dos',
    shopping: 'Your shopping lists',
    money: 'Expenses & budgets',
    routines: 'Daily routines & habits',
  };

  const handleAdd = useCallback(() => {
    switch (activeSpace) {
      case 'tasks':
        router.push('/add-task');
        break;
      case 'shopping':
        router.push('/add-list');
        break;
      case 'money':
        router.push('/add-expense');
        break;
    }
  }, [activeSpace, router]);

  return (
    <View style={styles.contentSectionRow}>
      <Text style={styles.contentSectionTitle}>{titles[activeSpace]}</Text>
      {hasContent && (
        <TouchableOpacity onPress={handleAdd} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="add-circle" size={24} color={SPACE_ACCENTS[activeSpace].color} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── DATE HELPERS ─────────────────────────────────────────

function formatTaskDue(dueDate: string): { label: string; status: 'overdue' | 'today' | 'tomorrow' | 'future' } {
  try {
    const date = new Date(dueDate.includes('T') ? dueDate : dueDate + 'T00:00:00');
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
    if (diff < 0) return { label: format(date, 'MMM d'), status: 'overdue' };
    if (diff === 0) return { label: 'Today', status: 'today' };
    if (diff === 1) return { label: 'Tomorrow', status: 'tomorrow' };
    return { label: format(date, 'MMM d'), status: 'future' };
  } catch {
    return { label: '', status: 'future' };
  }
}

function formatExpenseDate(dateStr: string): string {
  try {
    const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  } catch {
    return format(new Date(dateStr), 'MMM d');
  }
}

// ─── ANIMATED TASK ROW ─────────────────────────────────────

function AnimatedTaskRow({ task, onToggle, onDelete, isLast, styles, colors }: {
  task: any;
  onToggle: (id: string) => void;
  onDelete: (id: string, title: string) => void;
  isLast: boolean;
  styles: any;
  colors: any;
}) {
  const [completing, setCompleting] = useState(false);
  const checkScale = useSharedValue(1);
  const rowOpacity = useSharedValue(1);
  const rowTranslateX = useSharedValue(0);
  const rowHeight = useSharedValue(-1); // -1 = not yet measured

  const handleLayout = useCallback((e: any) => {
    if (rowHeight.value === -1) {
      rowHeight.value = e.nativeEvent.layout.height;
    }
  }, []);

  const handlePress = () => {
    if (completing) return;
    setCompleting(true);
    haptics.medium();

    // Phase 1 (0ms): Checkbox spring-pop with bounce
    checkScale.value = withSequence(
      withSpring(1.5, { damping: 3, stiffness: 600 }),
      withSpring(1.0, { damping: 10, stiffness: 250 })
    );

    // Phase 2 (160ms): Content fades + drifts right
    rowOpacity.value = withDelay(160, withTiming(0, { duration: 260, easing: Easing.out(Easing.ease) }));
    rowTranslateX.value = withDelay(160, withTiming(18, { duration: 280, easing: Easing.out(Easing.ease) }));

    // Phase 3 (360ms): Height collapses — rows below slide up smoothly
    rowHeight.value = withDelay(360, withTiming(0, { duration: 280, easing: Easing.inOut(Easing.cubic) }));

    // Phase 4 (660ms): Commit to store after full animation
    setTimeout(() => onToggle(task.id), 660);
  };

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const rowAnimStyle = useAnimatedStyle(() => ({
    opacity: rowOpacity.value,
    transform: [{ translateX: rowTranslateX.value }],
  }));

  const containerAnimStyle = useAnimatedStyle(() => {
    if (rowHeight.value === -1) return {};
    return { height: rowHeight.value, overflow: 'hidden' as const };
  });

  return (
    <Animated.View style={containerAnimStyle} onLayout={handleLayout}>
      <Animated.View style={[styles.taskRow, !isLast && styles.taskRowBorder, rowAnimStyle]}>
        <TouchableOpacity style={styles.taskRowMain} onPress={handlePress} activeOpacity={0.6}>
          <Animated.View style={[
            completing ? styles.taskCheckDone : styles.taskCheck,
            task.priority === 'high' && !completing && { borderColor: colors.error },
            checkAnimStyle,
          ]}>
            {completing && <Ionicons name="checkmark" size={13} color={colors.textInverse} />}
          </Animated.View>
          <View style={styles.taskInfo}>
            <Text style={[styles.taskTitle, completing && { color: colors.textTertiary, textDecorationLine: 'line-through' as const }]}>{task.title}</Text>
            <View style={styles.taskMeta}>
              {task.assignedTo && (
                <Avatar name={getUserName(task.assignedTo)} size={18} color={getUserColor(task.assignedTo)} />
              )}
              {task.recurring && <Ionicons name="repeat-outline" size={12} color={colors.textTertiary} />}
              {task.isChore && <Ionicons name="home-outline" size={12} color={colors.textTertiary} />}
            </View>
          </View>
          {task.dueDate && (() => {
            const { label, status } = formatTaskDue(task.dueDate!);
            return label ? (
              <Text style={[styles.taskDue, {
                color: status === 'overdue' ? colors.error : status === 'today' ? colors.warning : colors.textTertiary,
                fontWeight: (status === 'overdue' || status === 'today') ? '600' : '400',
              }]}>
                {label}
              </Text>
            ) : null;
          })()}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete(task.id, task.title)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.taskDeleteBtn}
        >
          <Ionicons name="trash-outline" size={14} color={colors.error} />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

// ─── TASKS CONTENT ────────────────────────────────────────

function TasksContent() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { tasks, toggleTask, deleteTask } = useTaskStore();
  const { showAlert } = useAlert();
  const [showDone, setShowDone] = useState(false);

  const handleDeleteTask = (id: string, title: string) => {
    Alert.alert(
      'Delete Task',
      `"${title}" will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTask(id).catch(() => showAlert('Error', 'Could not delete task.')),
        },
      ]
    );
  };

  const pending = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);

  const grouped = pending.reduce<Record<string, typeof pending>>((acc, task) => {
    const cat = task.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(task);
    return acc;
  }, {});

  const categoryOrder = ['household', 'errand', 'personal', 'work', 'other'];
  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => (categoryOrder.indexOf(a) === -1 ? 99 : categoryOrder.indexOf(a)) -
              (categoryOrder.indexOf(b) === -1 ? 99 : categoryOrder.indexOf(b))
  );

  if (tasks.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Ionicons name="checkmark-circle-outline" size={32} color={SPACE_ACCENTS.tasks.color} style={{ marginBottom: 8 }} />
        <Text style={styles.emptyText}>No tasks yet</Text>
        <Text style={styles.emptyHint}>Add tasks like chores, errands, or reminders to stay organized</Text>
        <TouchableOpacity
          style={[styles.emptyBtn, { backgroundColor: SPACE_ACCENTS.tasks.color }]}
          activeOpacity={0.7}
          onPress={() => router.push('/add-task')}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.emptyBtnText}>Add task</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      {sortedCategories.map((cat) => {
        const catKey = cat as keyof typeof categoryColors;
        const cc = categoryColors[catKey] || categoryColors.other;
        return (
          <View key={cat} style={styles.taskGroup}>
            <View style={styles.taskGroupHeader}>
              <View style={[styles.taskGroupDot, { backgroundColor: cc.icon }]} />
              <Text style={styles.taskGroupLabel}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
              <View style={styles.taskGroupCountBadge}>
                <Text style={styles.taskGroupCount}>{grouped[cat].length}</Text>
              </View>
            </View>
            <View style={styles.taskGroupCard}>
              {grouped[cat].map((task, idx) => (
                <AnimatedTaskRow
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onDelete={handleDeleteTask}
                  isLast={idx === grouped[cat].length - 1}
                  styles={styles}
                  colors={colors}
                />
              ))}
            </View>
          </View>
        );
      })}

      {/* Done section */}
      {done.length > 0 && (
        <View style={styles.doneSection}>
          <TouchableOpacity style={styles.doneHeader} onPress={() => setShowDone(!showDone)} activeOpacity={0.6}>
            <Ionicons
              name={showDone ? 'chevron-down' : 'chevron-forward'}
              size={16}
              color={colors.textTertiary}
            />
            <Text style={styles.doneLabel}>Done ({done.length})</Text>
          </TouchableOpacity>
          {showDone && (
            <View style={styles.taskGroupCard}>
              {done.map((task, idx) => (
                <View
                  key={task.id}
                  style={[
                    styles.taskRowDone,
                    idx < done.length - 1 && styles.taskRowBorder,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.taskRowMain}
                    onPress={() => toggleTask(task.id)}
                    activeOpacity={0.6}
                  >
                    <View style={styles.taskCheckDone}>
                      <Ionicons name="checkmark" size={13} color={colors.textInverse} />
                    </View>
                    <Text style={styles.taskTitleDone}>{task.title}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteTask(task.id, task.title)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.taskDeleteBtn}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── SHOPPING CONTENT ─────────────────────────────────────

function formatListDate(updatedAt: string): string {
  try {
    const date = new Date(updatedAt);
    if (isNaN(date.getTime())) return '';
    const diffHours = (Date.now() - date.getTime()) / (1000 * 60 * 60);
    return diffHours < 24 ? format(date, 'h:mm a') : format(date, 'MMM d');
  } catch {
    return '';
  }
}

function ShoppingContent() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { lists, deleteList } = useListStore();
  const { showAlert } = useAlert();

  const handleNew = () => {
    router.push('/add-list');
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete List',
      `"${name}" and all its items will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteList(id);
            } catch {
              showAlert('Error', 'Could not delete list. Please try again.');
            }
          },
        },
      ]
    );
  };

  const totalItems = lists.reduce((sum, l) => sum + l.items.length, 0);
  const checkedItems = lists.reduce((sum, l) => sum + l.items.filter(i => i.checked).length, 0);

  if (lists.length === 0) {
    return (
      <AnimatedCardEntrance index={0}>
        <View style={styles.shoppingEmptyWrap}>
          <View style={[styles.shoppingEmptyIcon, { backgroundColor: categoryColors.groceries.bg }]}>
            <Ionicons name="cart-outline" size={36} color={categoryColors.groceries.icon} />
          </View>
          <Text style={[styles.shoppingEmptyTitle, { color: colors.text }]}>No lists yet</Text>
          <Text style={[styles.shoppingEmptyHint, { color: colors.textSecondary }]}>
            Create a list for groceries, household supplies, or anything you need to track.
          </Text>
          <TouchableOpacity
            style={[styles.shoppingEmptyBtn, { backgroundColor: categoryColors.groceries.icon }]}
            activeOpacity={0.8}
            onPress={handleNew}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.shoppingEmptyBtnText}>Create your first list</Text>
          </TouchableOpacity>
        </View>
      </AnimatedCardEntrance>
    );
  }

  return (
    <View>
      {/* Summary row */}
      <AnimatedCardEntrance index={0}>
        <View style={[styles.shoppingSummaryRow, { backgroundColor: categoryColors.groceries.bg, borderColor: colors.borderLight }]}>
          <View style={styles.shoppingSummaryStat}>
            <Text style={[styles.shoppingSummaryNum, { color: categoryColors.groceries.icon }]}>{lists.length}</Text>
            <Text style={[styles.shoppingSummaryLabel, { color: colors.textSecondary }]}>Lists</Text>
          </View>
          <View style={[styles.shoppingSummaryDivider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.shoppingSummaryStat}>
            <Text style={[styles.shoppingSummaryNum, { color: categoryColors.groceries.icon }]}>{totalItems - checkedItems}</Text>
            <Text style={[styles.shoppingSummaryLabel, { color: colors.textSecondary }]}>Remaining</Text>
          </View>
          <View style={[styles.shoppingSummaryDivider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.shoppingSummaryStat}>
            <Text style={[styles.shoppingSummaryNum, { color: colors.success }]}>{checkedItems}</Text>
            <Text style={[styles.shoppingSummaryLabel, { color: colors.textSecondary }]}>Checked off</Text>
          </View>
        </View>
      </AnimatedCardEntrance>

      {/* List cards */}
      {lists.map((list, idx) => {
        const unchecked = list.items.filter(i => !i.checked).length;
        const total = list.items.length;
        const pct = total > 0 ? Math.round(((total - unchecked) / total) * 100) : 0;
        const isDone = total > 0 && unchecked === 0;
        return (
          <AnimatedCardEntrance key={list.id} index={idx + 1}>
            <View style={[styles.shoppingCard, { borderColor: isDone ? colors.success + '50' : colors.borderLight }, shadows.sm]}>
              <TouchableOpacity
                style={styles.shoppingCardTouchable}
                onPress={() => router.push(`/list/${list.id}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.shoppingCardIcon, { backgroundColor: isDone ? colors.success + '20' : categoryColors.groceries.bg }]}>
                  <Ionicons
                    name={isDone ? 'checkmark-circle' : 'cart-outline'}
                    size={22}
                    color={isDone ? colors.success : categoryColors.groceries.icon}
                  />
                </View>
                <View style={styles.shoppingCardBody}>
                  <Text style={[styles.shoppingCardName, { color: colors.text }]} numberOfLines={1}>{list.name}</Text>
                  <Text style={[styles.shoppingCardMeta, { color: isDone ? colors.success : colors.textSecondary }]}>
                    {total === 0
                      ? 'Tap to add items'
                      : isDone
                      ? '✓ All done!'
                      : `${unchecked} of ${total} remaining`}{list.updatedAt ? ` · ${formatListDate(list.updatedAt)}` : ''}
                  </Text>
                  {total > 0 && (
                    <View style={[styles.shoppingProgressTrack, { backgroundColor: colors.borderLight }]}>
                      <View
                        style={[
                          styles.shoppingProgressFill,
                          {
                            width: `${pct}%` as any,
                            backgroundColor: isDone ? colors.success : categoryColors.groceries.icon,
                          },
                        ]}
                      />
                    </View>
                  )}
                </View>
                {total > 0 && (
                  <View style={[styles.shoppingPctBadge, { backgroundColor: isDone ? colors.success + '20' : categoryColors.groceries.bg }]}>
                    <Text style={[styles.shoppingPctText, { color: isDone ? colors.success : categoryColors.groceries.icon }]}>
                      {pct}%
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shoppingDeleteBtn}
                onPress={() => handleDelete(list.id, list.name)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={15} color={colors.error} />
              </TouchableOpacity>
            </View>
          </AnimatedCardEntrance>
        );
      })}

      {/* Add new list button */}
      <AnimatedCardEntrance index={lists.length + 1}>
        <TouchableOpacity
          style={[styles.shoppingAddRow, { borderColor: categoryColors.groceries.icon + '40', backgroundColor: categoryColors.groceries.bg }]}
          onPress={handleNew}
          activeOpacity={0.7}
        >
          <View style={[styles.shoppingAddIcon, { backgroundColor: categoryColors.groceries.icon + '20' }]}>
            <Ionicons name="add" size={18} color={categoryColors.groceries.icon} />
          </View>
          <Text style={[styles.shoppingAddText, { color: categoryColors.groceries.icon }]}>New list</Text>
          <Ionicons name="chevron-forward" size={16} color={categoryColors.groceries.icon + '80'} />
        </TouchableOpacity>
      </AnimatedCardEntrance>
    </View>
  );
}

// ─── MONEY CONTENT ────────────────────────────────────────

function MoneyContent() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { expenses, getBalance, deleteExpense } = useExpenseStore();
  const { showAlert: showMoneyAlert } = useAlert();
  const { mode } = useModeStore();
  const { budgets } = useBudgetStore();
  const cs = useSettingsStore((s) => s.currencySymbol) || '$';
  const balance = useMemo(() => getBalance(), [expenses]);
  const unsettled = useMemo(() => expenses.filter(e => !e.settled), [expenses]);
  const isSingle = mode === 'personal';
  const displayExpenses = isSingle ? expenses : unsettled;

  const catIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    groceries: 'cart-outline',
    dining: 'restaurant-outline',
    utilities: 'flash-outline',
    rent: 'home-outline',
    transport: 'car-outline',
    entertainment: 'film-outline',
    health: 'heart-outline',
    other: 'ellipsis-horizontal-outline',
  };

  const handleDeleteExpense = (id: string, title: string) => {
    Alert.alert(
      'Delete Expense',
      `"${title}" will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteExpense(id).catch(() => showMoneyAlert('Error', 'Could not delete expense.')),
        },
      ]
    );
  };

  const monthlySpent = expenses
    .filter(e => e.date.startsWith(format(new Date(), 'yyyy-MM')))
    .reduce((s, e) => s + e.amount, 0);
  const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
  const budgetUsed = budgets.reduce((s, b) => s + b.spent, 0);

  if (expenses.length === 0 && budgets.length === 0) {
    return (
      <View>
        <View style={styles.emptyCard}>
          <Ionicons name="wallet-outline" size={32} color={SPACE_ACCENTS.money.color} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyText}>Manage your finances</Text>
          <Text style={styles.emptyHint}>
            {isSingle
              ? 'Track spending, set budgets, and save towards your goals — all in one place.'
              : 'Track shared expenses, set household budgets, and manage savings together.'}
          </Text>
        </View>
        <View style={styles.moneyLinksRow}>
          <TouchableOpacity style={styles.moneyLinkBtn} onPress={() => router.push('/add-expense')} activeOpacity={0.7}>
            <Ionicons name="card-outline" size={18} color={SPACE_ACCENTS.money.color} />
            <Text style={styles.moneyLinkText}>{isSingle ? 'Log expense' : 'Add expense'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moneyLinkBtn} onPress={() => router.push('/budget' as any)} activeOpacity={0.7}>
            <Ionicons name="pie-chart-outline" size={18} color={colors.warning} />
            <Text style={styles.moneyLinkText}>Budget</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moneyLinkBtn} onPress={() => router.push('/savings' as any)} activeOpacity={0.7}>
            <Ionicons name="trending-up-outline" size={18} color={colors.success} />
            <Text style={styles.moneyLinkText}>Savings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View>
      {/* Single mode: Spending summary + budget usage */}
      {isSingle ? (
        <TouchableOpacity style={styles.balanceCard} onPress={() => router.push('/expense-insights' as any)} activeOpacity={0.7}>
          <View style={styles.balanceTop}>
            <Text style={styles.balanceLabel}>Spent this month</Text>
            <Text style={[styles.balanceAmount, { color: colors.text }]}>
              {cs}{monthlySpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          {totalBudget > 0 && (
            <>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceBottom}>
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceItemLabel}>Budget used</Text>
                  <Text style={styles.balanceItemValue}>
                    {totalBudget > 0 ? Math.round((budgetUsed / totalBudget) * 100) : 0}%
                  </Text>
                </View>
                <View style={styles.balanceItemDivider} />
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceItemLabel}>Remaining</Text>
                  <Text style={[styles.balanceItemValue, { color: (totalBudget - budgetUsed) >= 0 ? colors.success : colors.error }]}>
                    {cs}{Math.abs(totalBudget - budgetUsed).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              </View>
            </>
          )}
        </TouchableOpacity>
      ) : (
        /* Couple/Family mode: Balance Card */
        <TouchableOpacity style={styles.balanceCard} onPress={() => router.push('/settle-up')} activeOpacity={0.7}>
          <View style={styles.balanceTop}>
            <Text style={styles.balanceLabel}>Net balance</Text>
            <Text style={[
              styles.balanceAmount,
              { color: balance.net >= 0 ? colors.success : colors.error },
            ]}>
              {balance.net >= 0 ? '+' : '-'}{cs}{Math.abs(balance.net).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceBottom}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>You owe</Text>
              <Text style={styles.balanceItemValue}>{cs}{balance.userOwes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.balanceItemDivider} />
            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>Owed to you</Text>
              <Text style={styles.balanceItemValue}>{cs}{balance.partnerOwes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Quick action links */}
      <View style={styles.moneyLinksRow}>
        <TouchableOpacity style={styles.moneyLinkBtn} onPress={() => router.push('/budget' as any)} activeOpacity={0.7}>
          <Ionicons name="pie-chart-outline" size={18} color={colors.warning} />
          <Text style={styles.moneyLinkText}>Budget</Text>
        </TouchableOpacity>
        {!isSingle && (
          <TouchableOpacity style={styles.moneyLinkBtn} onPress={() => router.push('/settle-up')} activeOpacity={0.7}>
            <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
            <Text style={styles.moneyLinkText}>Settle up</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.moneyLinkBtn} onPress={() => router.push('/savings' as any)} activeOpacity={0.7}>
          <Ionicons name="trending-up-outline" size={18} color={colors.success} />
          <Text style={styles.moneyLinkText}>Savings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moneyLinkBtn} onPress={() => router.push('/expense-insights' as any)} activeOpacity={0.7}>
          <Ionicons name="analytics-outline" size={18} color="#8B5CF6" />
          <Text style={styles.moneyLinkText}>Insights</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Expenses */}
      <View style={styles.expenseSectionHeader}>
        <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>RECENT EXPENSES</Text>
        <View style={styles.expenseSectionActions}>
          {displayExpenses.length > 4 && (
            <TouchableOpacity onPress={() => router.push('/expense-insights' as any)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.seeAllLink}>See all</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.push('/add-expense')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="add-circle" size={22} color={SPACE_ACCENTS.money.color} />
          </TouchableOpacity>
        </View>
      </View>
      {displayExpenses.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyText}>{isSingle ? 'No expenses logged' : 'All settled up!'}</Text>
          <Text style={styles.emptyHint}>{isSingle ? 'Start logging to track spending' : 'No outstanding expenses between you'}</Text>
        </View>
      ) : (
        <View style={styles.expensesCard}>
          {displayExpenses.slice(0, 4).map((exp, idx, arr) => {
            const cc = categoryColors[exp.category] || categoryColors.other;
            return (
              <View
                key={exp.id}
                style={[
                  styles.expenseRow,
                  idx < arr.length - 1 && styles.expenseRowBorder,
                ]}
              >
                <TouchableOpacity
                  style={styles.expenseRowMain}
                  onPress={() => router.push('/expense-insights' as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.expenseIcon, { backgroundColor: cc.bg }]}>
                    <Ionicons
                      name={catIcons[exp.category] || 'ellipsis-horizontal-outline'}
                      size={16}
                      color={cc.icon}
                    />
                  </View>
                  <View style={styles.expenseInfo}>
                    <Text style={styles.expenseTitle}>{exp.title}</Text>
                    <Text style={styles.expenseMeta}>
                      {isSingle ? '' : `${getUserName(exp.paidBy)} · `}{formatExpenseDate(exp.date)}
                    </Text>
                  </View>
                  <Text style={styles.expenseAmount}>{cs}{exp.amount.toFixed(2)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteExpense(exp.id, exp.title)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.taskDeleteBtn}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.error} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── ROUTINES CONTENT ─────────────────────────────────────

function RoutinesContent() {
  const router = useRouter();
  const { colors, shadows, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const habitStyles = useMemo(() => createHabitStyles(colors, shadows), [colors, shadows]);
  const { habits, toggleToday, isCompletedToday, removeHabit } = useHabitStore();
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTriggered = useRef(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const completedCount = habits.filter(h => h.completedDates.includes(todayStr)).length;
  const allDone = habits.length > 0 && completedCount === habits.length;

  // Fire confetti when all habits done for the day
  useEffect(() => {
    if (allDone && !confettiTriggered.current) {
      confettiTriggered.current = true;
      haptics.success();
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
    if (!allDone) confettiTriggered.current = false;
  }, [allDone]);

  const handleToggle = (id: string) => {
    haptics.selection();
    toggleToday(id);
  };

  const handleDelete = (id: string, title: string) => {
    haptics.light();
    removeHabit(id);
  };

  // Get last 7 days for consistency dots
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    return format(d, 'yyyy-MM-dd');
  });

  if (habits.length === 0) {
    return (
      <View>
        <View style={styles.emptyCard}>
          <Ionicons name="repeat-outline" size={32} color={SPACE_ACCENTS.routines.color} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyText}>No routines yet</Text>
          <Text style={styles.emptyHint}>
            Build healthy habits like morning stretches, reading, or bedtime wind-down. Track your streaks daily.
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: SPACE_ACCENTS.routines.color }]}
            activeOpacity={0.7}
            onPress={() => router.push('/add-habit')}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.emptyBtnText}>Create habit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View>
      {showConfetti && <ConfettiBurst trigger={showConfetti} />}

      {/* Today's progress banner */}
      <AnimatedCardEntrance index={0}>
        <LinearGradient
          colors={allDone ? ['#10B981', '#059669'] : ['#3B82F6', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={habitStyles.progressBanner}
        >
          <View style={habitStyles.progressLeft}>
            <Text style={habitStyles.progressEmoji}>{allDone ? '🎉' : '⚡'}</Text>
            <View>
              <Text style={habitStyles.progressTitle}>
                {allDone ? 'All done today!' : `${completedCount} of ${habits.length} done`}
              </Text>
              <Text style={habitStyles.progressSub}>
                {allDone ? 'Keep up the great work' : `${habits.length - completedCount} habit${habits.length - completedCount !== 1 ? 's' : ''} remaining`}
              </Text>
            </View>
          </View>
          <View style={habitStyles.progressRing}>
            <Text style={habitStyles.progressPct}>{habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0}%</Text>
          </View>
        </LinearGradient>
      </AnimatedCardEntrance>

      {/* Habit cards */}
      {habits.map((habit, idx) => {
        const completed = isCompletedToday(habit.id);
        const colorSet = HABIT_COLORS[idx % HABIT_COLORS.length];

        return (
          <AnimatedCardEntrance key={habit.id} index={idx + 1}>
            <PressableScale onPress={() => handleToggle(habit.id)}>
              <View style={[habitStyles.habitCard, completed && habitStyles.habitCardDone]}>
                <View style={habitStyles.habitMain}>
                  {/* Emoji + check */}
                  <View style={[habitStyles.habitEmoji, { backgroundColor: adaptTintColor(colorSet.bg, isDark) }]}>
                    <Text style={{ fontSize: 22 }}>{habit.emoji || '⭐'}</Text>
                    {completed && (
                      <View style={habitStyles.checkBadge}>
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      </View>
                    )}
                  </View>

                  {/* Title + streak */}
                  <View style={habitStyles.habitInfo}>
                    <Text style={[habitStyles.habitTitle, completed && habitStyles.habitTitleDone]}>{habit.title}</Text>
                    <View style={habitStyles.habitMeta}>
                      {habit.streak > 0 && (
                        <View style={habitStyles.streakBadge}>
                          <Text style={habitStyles.streakText}>🔥 {habit.streak} day{habit.streak !== 1 ? 's' : ''}</Text>
                        </View>
                      )}
                      <Text style={habitStyles.frequencyText}>
                        {habit.frequency === 'daily' ? 'Every day'
                          : habit.frequency === 'weekdays' ? 'Weekdays'
                          : habit.frequency === 'weekends' ? 'Weekends'
                          : 'Once a week'}
                      </Text>
                    </View>
                  </View>

                  {/* Delete — inline before toggle so it never overlaps */}
                  <TouchableOpacity
                    style={habitStyles.deleteBtn}
                    onPress={() => handleDelete(habit.id, habit.title)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.error} />
                  </TouchableOpacity>

                  {/* Toggle circle */}
                  <TouchableOpacity
                    onPress={() => handleToggle(habit.id)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <LinearGradient
                      colors={completed ? colorSet.gradient as unknown as [string, string] : ['transparent', 'transparent']}
                      style={[
                        habitStyles.toggleCircle,
                        !completed && { borderWidth: 2, borderColor: colors.border },
                      ]}
                    >
                      {completed && <Ionicons name="checkmark" size={18} color="#fff" />}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Weekly consistency dots */}
                <View style={habitStyles.weekDots}>
                  {last7Days.map((day, i) => {
                    const isDone = habit.completedDates.includes(day);
                    const isCurrentDay = day === todayStr;
                    return (
                      <View key={day} style={habitStyles.dotColumn}>
                        <View
                          style={[
                            habitStyles.dot,
                            isDone && { backgroundColor: colorSet.gradient[0] },
                            isCurrentDay && !isDone && habitStyles.dotCurrent,
                          ]}
                        />
                        <Text style={[habitStyles.dotLabel, isCurrentDay && habitStyles.dotLabelCurrent]}>
                          {format(subDays(new Date(), 6 - i), 'EEE').charAt(0)}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Best streak badge */}
                {habit.bestStreak >= 7 && (
                  <View style={habitStyles.bestStreakRow}>
                    <Ionicons name="trophy-outline" size={12} color="#F59E0B" />
                    <Text style={habitStyles.bestStreakText}>Best: {habit.bestStreak} days</Text>
                  </View>
                )}
              </View>
            </PressableScale>
          </AnimatedCardEntrance>
        );
      })}

      {/* Add more */}
      <TouchableOpacity
        style={habitStyles.addMoreBtn}
        onPress={() => { haptics.light(); router.push('/add-habit'); }}
        activeOpacity={0.6}
      >
        <Ionicons name="add-circle-outline" size={20} color={SPACE_ACCENTS.routines.color} />
        <Text style={habitStyles.addMoreText}>Add habit</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── ADD HABIT MODAL ─────────────────────────────────────

function AddHabitModal({ visible, onClose, onAdd }: {
  visible: boolean;
  onClose: () => void;
  onAdd: (habit: any) => Promise<void>;
}) {
  const { colors, shadows } = useTheme();
  const habitStyles = useMemo(() => createHabitStyles(colors, shadows), [colors, shadows]);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🏃');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [selectedColor, setSelectedColor] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    Keyboard.dismiss();
    setSaving(true);
    try {
      await onAdd({
        title: title.trim(),
        emoji,
        frequency,
        color: HABIT_COLORS[selectedColor].gradient[0],
        createdBy: '',
      });
      haptics.success();
      setTitle('');
      setEmoji('🏃');
      setFrequency('daily');
      setSelectedColor(0);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={habitStyles.modalOverlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <Animated.View entering={FadeInUp.duration(300)} style={habitStyles.modalContent}>
              {/* Header */}
              <View style={habitStyles.modalHeader}>
                <Text style={habitStyles.modalTitle}>New Habit</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Emoji picker */}
              <Text style={habitStyles.modalLabel}>Choose an icon</Text>
              <View style={habitStyles.emojiGrid}>
                {HABIT_EMOJIS.map((e) => (
                  <PressableScale key={e} onPress={() => { haptics.selection(); setEmoji(e); }}>
                    <View style={[habitStyles.emojiOption, emoji === e && habitStyles.emojiOptionActive]}>
                      <Text style={{ fontSize: 24 }}>{e}</Text>
                    </View>
                  </PressableScale>
                ))}
              </View>

              {/* Title */}
              <Text style={habitStyles.modalLabel}>Habit name</Text>
              <TextInput
                style={habitStyles.modalInput}
                placeholder="e.g. Morning stretches, Read 20 min..."
                placeholderTextColor={colors.textTertiary}
                value={title}
                onChangeText={setTitle}
                autoFocus
              />

              {/* Frequency */}
              <Text style={habitStyles.modalLabel}>Frequency</Text>
              <View style={habitStyles.freqRow}>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <PressableScale key={opt.value} onPress={() => { haptics.selection(); setFrequency(opt.value); }}>
                    <View style={[habitStyles.freqChip, frequency === opt.value && habitStyles.freqChipActive]}>
                      <Text style={[habitStyles.freqChipText, frequency === opt.value && habitStyles.freqChipTextActive]}>
                        {opt.label}
                      </Text>
                    </View>
                  </PressableScale>
                ))}
              </View>

              {/* Color */}
              <Text style={habitStyles.modalLabel}>Color</Text>
              <View style={habitStyles.colorRow}>
                {HABIT_COLORS.map((c, i) => (
                  <PressableScale key={i} onPress={() => { haptics.selection(); setSelectedColor(i); }}>
                    <LinearGradient
                      colors={c.gradient as unknown as [string, string]}
                      style={[habitStyles.colorDot, selectedColor === i && habitStyles.colorDotActive]}
                    />
                  </PressableScale>
                ))}
              </View>

              {/* Save */}
              <PressableScale onPress={handleSave} disabled={!title.trim() || saving}>
                <LinearGradient
                  colors={HABIT_COLORS[selectedColor].gradient as unknown as [string, string]}
                  style={[habitStyles.saveBtn, (!title.trim() || saving) && { opacity: 0.5 }]}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={habitStyles.saveBtnText}>{saving ? 'Saving...' : 'Create Habit'}</Text>
                </LinearGradient>
              </PressableScale>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── STYLES ───────────────────────────────────────────────

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Compact scroll header
  compactHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  compactHeaderTitle: {
    ...typography.headline,
    color: colors.text,
    fontSize: 15,
  },
  compactHeaderBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID_PADDING,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  headerAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    ...typography.largeTitle,
    color: colors.text,
  },
  screenSubtitle: {
    ...typography.callout,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Grid
  grid: {
    paddingHorizontal: GRID_PADDING,
    gap: GRID_GAP,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
  },
  spaceCard: {
    width: CARD_WIDTH,
    height: 160,
    borderRadius: radius.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  spaceCardActive: {
    ...shadows.md,
  },
  spaceCardInner: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  spaceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  spaceTitle: {
    ...typography.headline,
    color: colors.text,
  },
  spaceStat: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  spaceStatHighlight: {
    ...typography.headline,
    marginTop: 2,
  },
  spaceSubtext: {
    ...typography.caption2,
    color: colors.textTertiary,
    marginTop: 1,
  },
  spaceProgressTrack: {
    height: 3,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    marginTop: spacing.sm,
  },
  spaceProgressFill: {
    height: 3,
    borderRadius: 2,
  },

  // Content area
  contentArea: {
    paddingHorizontal: GRID_PADDING,
  },
  contentSectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing['2xl'],
    marginBottom: spacing.sm,
  },
  contentSectionTitle: {
    ...typography.title3,
    color: colors.text,
  },

  // Section label (shared)
  sectionLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0,
    marginTop: spacing['2xl'],
    marginBottom: spacing.sm,
    marginLeft: 2,
  },
  expenseSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing['2xl'],
    marginBottom: spacing.sm,
  },
  expenseSectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  seeAllLink: {
    ...typography.subhead,
    color: colors.primary,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  emptyText: {
    ...typography.callout,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  emptyHint: {
    ...typography.caption1,
    color: colors.textTertiary,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    marginTop: spacing.md,
  },
  emptyBtnText: {
    ...typography.subhead,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // ─── Tasks ──────────────────────────
  taskGroup: {
    marginTop: spacing.lg,
  },
  taskGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  taskGroupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskGroupLabel: {
    ...typography.subhead,
    color: colors.text,
    flex: 1,
  },
  taskGroupCountBadge: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  taskGroupCount: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  taskGroupCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  taskRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  taskDeleteBtn: {
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskRowBorder: {
  },
  taskCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
  },
  taskInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  taskTitle: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  taskDue: {
    ...typography.caption1,
    color: colors.textTertiary,
  },

  // Done
  doneSection: {
    marginTop: spacing['2xl'],
  },
  doneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  doneLabel: {
    ...typography.subhead,
    color: colors.textTertiary,
  },
  taskRowDone: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    opacity: 0.5,
  },
  taskCheckDone: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitleDone: {
    ...typography.body,
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
    flex: 1,
  },

  // ─── Shopping ───────────────────────
  shoppingEmptyWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.xl,
  },
  shoppingEmptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  shoppingEmptyTitle: {
    ...typography.title3,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  shoppingEmptyHint: {
    ...typography.subhead,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  shoppingEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  shoppingEmptyBtnText: {
    ...typography.subhead,
    color: '#fff',
    fontWeight: '700',
  },
  shoppingSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  shoppingSummaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  shoppingSummaryNum: {
    ...typography.title3,
    fontWeight: '700',
  },
  shoppingSummaryLabel: {
    ...typography.caption2,
    marginTop: 2,
  },
  shoppingSummaryDivider: {
    width: 1,
    height: 28,
  },
  shoppingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginBottom: spacing.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  shoppingCardTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingRight: 44,
  },
  shoppingCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  shoppingCardBody: {
    flex: 1,
  },
  shoppingCardName: {
    ...typography.headline,
    fontWeight: '600',
    marginBottom: 2,
  },
  shoppingCardMeta: {
    ...typography.caption1,
    marginBottom: spacing.sm,
  },
  shoppingProgressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  shoppingProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  shoppingPctBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginLeft: spacing.sm,
    minWidth: 42,
    alignItems: 'center',
  },
  shoppingPctText: {
    ...typography.caption1,
    fontWeight: '700',
  },
  shoppingDeleteBtn: {
    position: 'absolute',
    top: '50%' as any,
    right: spacing.md,
    width: 28,
    height: 28,
    marginTop: -14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shoppingAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  shoppingAddIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shoppingAddText: {
    ...typography.subhead,
    fontWeight: '600',
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  createText: {
    ...typography.subhead,
    color: colors.primary,
  },

  // ─── Money ──────────────────────────
  moneyLinksRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  moneyLinkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  moneyLinkText: {
    ...typography.subhead,
    color: colors.text,
    fontWeight: '600',
  },
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  balanceTop: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
  },
  balanceLabel: {
    ...typography.caption1,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceAmount: {
    ...typography.largeTitle,
    marginTop: spacing.xs,
  },
  balanceDivider: {
    marginHorizontal: spacing.lg,
  },
  balanceBottom: {
    flexDirection: 'row',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceItemDivider: {
  },
  balanceItemLabel: {
    ...typography.caption2,
    color: colors.textTertiary,
  },
  balanceItemValue: {
    ...typography.headline,
    color: colors.text,
    marginTop: 2,
  },

  // Expenses
  expensesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    gap: spacing.sm,
  },
  expenseRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  expenseRowBorder: {
  },
  expenseIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    ...typography.body,
    color: colors.text,
  },
  expenseMeta: {
    ...typography.caption2,
    color: colors.textTertiary,
    marginTop: 1,
  },
  expenseAmount: {
    ...typography.headline,
    color: colors.text,
  },

});

// ─── HABIT STYLES ──────────────────────────────────────────
const createHabitStyles = (colors: any, shadows: any) => StyleSheet.create({
  // Progress banner
  progressBanner: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  progressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  progressEmoji: { fontSize: 28 },
  progressTitle: {
    ...typography.headline,
    color: '#fff',
  },
  progressSub: {
    ...typography.caption1,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  progressRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPct: {
    ...typography.headline,
    color: '#fff',
    fontSize: 14,
  },

  // Habit card
  habitCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  habitCardDone: {
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  habitMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  habitEmoji: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  habitInfo: {
    flex: 1,
  },
  habitTitle: {
    ...typography.headline,
    color: colors.text,
  },
  habitTitleDone: {
    color: colors.textSecondary,
  },
  habitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  streakBadge: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  streakText: {
    ...typography.caption2,
    color: colors.warning,
    fontWeight: '600',
  },
  frequencyText: {
    ...typography.caption2,
    color: colors.textTertiary,
    textTransform: 'capitalize',
  },
  toggleCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Week consistency dots
  weekDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
  },
  dotColumn: {
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderLight,
  },
  dotCurrent: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  dotLabel: {
    ...typography.caption2,
    color: colors.textTertiary,
    fontSize: 10,
  },
  dotLabelCurrent: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Best streak
  bestStreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  bestStreakText: {
    ...typography.caption2,
    color: '#F59E0B',
  },

  // Delete — inline in habitMain row, never overlaps toggle circle
  deleteBtn: {
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Add more button
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  addMoreText: {
    ...typography.subhead,
    color: SPACE_ACCENTS.routines.color,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    ...typography.title2,
    color: colors.text,
  },
  modalLabel: {
    ...typography.subhead,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  emojiOption: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  emojiOptionActive: {
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  modalInput: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  freqRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  freqChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  freqChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: '#3B82F6',
  },
  freqChipText: {
    ...typography.subhead,
    color: colors.textSecondary,
  },
  freqChipTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: colors.text,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.xl,
    marginTop: spacing.xl,
  },
  saveBtnText: {
    ...typography.headline,
    color: '#fff',
  },
});
