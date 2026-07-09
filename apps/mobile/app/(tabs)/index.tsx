import React, { useMemo, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format, parseISO, differenceInDays, differenceInMinutes } from 'date-fns';
import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  modeThemes,
  heroTypography,
} from '../../src/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientCard } from '../../src/components/ui/GradientCard';
import { Avatar } from '../../src/components/ui/Avatar';
import { useAuthStore } from '../../src/stores/authStore';
import { useHouseholdStore } from '../../src/stores/householdStore';
import { useModeStore } from '../../src/stores/modeStore';
import { useCalendarStore } from '../../src/stores/calendarStore';
import { useTaskStore } from '../../src/stores/taskStore';
import { useListStore } from '../../src/stores/listStore';
import { useExpenseStore } from '../../src/stores/expenseStore';
import { useNotificationStore } from '../../src/stores/notificationStore';
import { useMealStore } from '../../src/stores/mealStore';
import { useHabitStore } from '../../src/stores/habitStore';
import { useCountdownStore } from '../../src/stores/countdownStore';
import { useBudgetStore } from '../../src/stores/budgetStore';
import { useWellnessStore } from '../../src/stores/wellnessStore';
import { useCircleStore } from '../../src/stores/circleStore';
import { CircleSwitcher } from '../../src/components/CircleSwitcher';
import { MoreChips } from '../../src/components/home/MoreChips';
import { Suggestions } from '../../src/components/home/Suggestions';
import { useSettingsStore } from '../../src/stores/settingsStore';

const MOOD_EMOJIS: Record<number, string> = {
  1: '\u{1F614}',
  2: '\u{1F610}',
  3: '\u{1F642}',
  4: '\u{1F60A}',
  5: '\u{1F929}',
};

const MODE_LABELS: Record<string, string> = {
  single: 'Personal',
  couple: 'Partner',
  family: 'Family',
  parenting: 'Parenting',
};

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { household, members } = useHouseholdStore();
  const { mode } = useModeStore();
  const { events, fetchEvents } = useCalendarStore();
  const { tasks, toggleTask, fetchTasks } = useTaskStore();
  const { lists, fetchLists } = useListStore();
  const { expenses, getBalance, fetchExpenses } = useExpenseStore();
  const unreadCount = useNotificationStore((s) => s.getUnreadCount());
  const { weekPlan, getMealById, fetchMeals, fetchMealPlans } = useMealStore();
  const { habits, toggleToday, isCompletedToday, fetchHabits } = useHabitStore();
  const { countdowns: rawCountdowns, fetchCountdowns } = useCountdownStore();
  const { budgets, fetchBudgets } = useBudgetStore();
  const { getTodayEntry, fetchEntries: fetchWellness } = useWellnessStore();
  const { fetchCircles } = useCircleStore();
  const cs = useSettingsStore((s) => s.currencySymbol) || '$';
  const [refreshing, setRefreshing] = useState(false);

  // Derive current user and partner from real data
  const currentUser = useMemo(() => ({
    id: user?.id ?? '',
    name: user?.name ?? 'You',
    email: user?.email ?? '',
    color: colors.primary,
    role: 'owner' as const,
  }), [user]);

  const partner = useMemo(() => {
    const p = members.find((m) => m.id !== user?.id);
    return p ?? { id: '', name: 'Partner', email: '', color: colors.success, role: 'partner' as const };
  }, [members, user]);

  const householdChildren = useMemo(() => {
    return household?.children ?? [];
  }, [household]);

  const refreshAllData = useCallback(async () => {
    await Promise.allSettled([
      fetchCircles(),
      fetchEvents(),
      fetchTasks(),
      fetchLists(),
      fetchExpenses(),
      fetchMeals(),
      fetchMealPlans(),
      fetchHabits(),
      fetchCountdowns(),
      fetchBudgets(),
      fetchWellness(),
    ]);
  }, []);

  // Fetch all data on mount
  useEffect(() => {
    refreshAllData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAllData();
    setRefreshing(false);
  }, [refreshAllData]);

  // Helper functions (replacing mock helpers)
  const getUserName = useCallback((userId: string) => {
    if (userId === currentUser.id) return currentUser.name;
    const member = members.find((m) => m.id === userId);
    return member?.name ?? 'Unknown';
  }, [currentUser, members]);

  const getUserColor = useCallback((userId: string) => {
    if (userId === currentUser.id) return currentUser.color;
    const member = members.find((m) => m.id === userId);
    return member?.color ?? colors.textTertiary;
  }, [currentUser, members]);

  const getDaysSinceTogether = useCallback(() => {
    if (!household?.togetherSince) return 0;
    return differenceInDays(new Date(), parseISO(household.togetherSince));
  }, [household]);

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const modeTheme = modeThemes[mode];

  // ════════════════════════════════════════════
  // ALL useMemo HOOKS (top-level, never conditional)
  // ════════════════════════════════════════════

  const todayEvents = useMemo(() => {
    return events
      .filter((e) => e.startDate.startsWith(todayStr))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [events, todayStr]);

  const totalUncheckedItems = useMemo(() => {
    return lists.reduce((acc, list) => {
      return acc + list.items.filter((i) => !i.checked).length;
    }, 0);
  }, [lists]);

  const budgetOverview = useMemo(() => {
    const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
    const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
    const remaining = totalLimit - totalSpent;
    const spentRatio = totalLimit > 0 ? totalSpent / totalLimit : 0;
    const spentPercent = Math.round(spentRatio * 100);
    return { totalLimit, totalSpent, remaining, spentRatio, spentPercent };
  }, [budgets]);

  const countdowns = useMemo(() => {
    return rawCountdowns
      .map((c) => ({
        ...c,
        daysUntil: differenceInDays(parseISO(c.date), now),
      }))
      .filter((c) => c.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [rawCountdowns]);

  const chores = useMemo(() => {
    return tasks.filter((t) => t.isChore && !t.completed);
  }, [tasks]);

  // Couple mode: expense balance (from store)
  const balanceData = useMemo(() => {
    const { userOwes, partnerOwes, net } = getBalance();
    return {
      netBalance: net,
      label:
        net > 0
          ? `${partner.name} owes you`
          : net < 0
            ? `You owe ${partner.name}`
            : 'All settled',
      amount: Math.abs(net),
      total: partnerOwes + userOwes,
    };
  }, [getBalance]);

  // Family mode: all members list
  const allFamilyMembers = useMemo(() => {
    const membersList = members.map((m) => ({
      id: m.id,
      name: m.name,
      color: m.color || colors.primary,
    }));
    const childrenList = householdChildren.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
    }));
    return [...membersList, ...childrenList];
  }, [members, householdChildren]);

  // Family mode: per-member schedules
  const familyMemberSchedules = useMemo(() => {
    return allFamilyMembers.map((member) => {
      const memberEvents = todayEvents.filter(
        (e) => e.createdBy === member.id,
      );
      return { member, events: memberEvents };
    });
  }, [allFamilyMembers, todayEvents]);

  // Parenting mode: baby logs (populated from API when baby log store is wired)
  const babyLogs = useMemo(() => {
    return {
      lastFeed: undefined as { timestamp: string; note?: string; duration?: number } | undefined,
      lastSleep: undefined as { timestamp: string; note?: string; duration?: number } | undefined,
      lastDiaper: undefined as { timestamp: string; note?: string } | undefined,
    };
  }, []);

  // Parenting mode: bedtime countdown for first child with bedtime set
  const bedtimeChild = useMemo(() => {
    return householdChildren.find((c) => c.bedtime);
  }, [householdChildren]);

  const bedtimeCountdown = useMemo(() => {
    if (!bedtimeChild?.bedtime) return null;
    const bedtimeStr = bedtimeChild.bedtime;
    const match = bedtimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const bedtime = new Date();
    bedtime.setHours(hours, minutes, 0, 0);

    const diffMins = differenceInMinutes(bedtime, now);
    if (diffMins <= 0) return null;

    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return { hours: hrs, minutes: mins };
  }, [bedtimeChild]);

  // ════════════════════════════════════════════
  // SHARED RENDER HELPERS
  // ════════════════════════════════════════════

  function renderSectionHead(
    title: string,
    opts?: {
      onSeeAll?: () => void;
      onAdd?: () => void;
      showSeeAll?: boolean;
      itemCount?: number;
    },
  ) {
    const showSeeAll = (opts?.showSeeAll ?? false) && (opts?.itemCount === undefined || opts.itemCount > 4);
    const showAdd = opts?.onAdd && (opts?.itemCount === undefined || opts.itemCount > 0);
    return (
      <View style={[styles.sectionHeader, styles.sectionGap]}>
        <View style={[styles.sectionDot, { backgroundColor: modeTheme.accent }]} />
        <Text style={styles.sectionTitle}>{title}</Text>
        {showSeeAll && opts?.onSeeAll && (
          <TouchableOpacity
            onPress={opts.onSeeAll}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.sectionLink}>See all</Text>
          </TouchableOpacity>
        )}
        {showAdd && (
          <TouchableOpacity
            onPress={opts!.onAdd}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.sectionAddBtn}
          >
            <Ionicons name="add-circle" size={22} color={modeTheme.accent} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderEmptyState(
    icon: keyof typeof Ionicons.glyphMap,
    message: string,
    actionLabel: string,
    onAction: () => void,
  ) {
    return (
      <View style={styles.emptyStateContainer}>
        <View style={[styles.emptyStateIcon, { backgroundColor: modeTheme.accent + '15' }]}>
          <Ionicons name={icon} size={24} color={modeTheme.accent} />
        </View>
        <Text style={styles.emptyStateText}>{message}</Text>
        <TouchableOpacity
          style={[styles.emptyStateBtn, { backgroundColor: modeTheme.accent }]}
          activeOpacity={0.7}
          onPress={onAction}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.emptyStateBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Build contextual suggestions based on what the user hasn't done yet
  const suggestions = useMemo(() => {
    const items: { id: string; icon: any; title: string; subtitle: string; color: string; bg: string; route: string; params?: Record<string, string> }[] = [];

    // Suggest wellness logging if not done today
    const todayWellness = getTodayEntry();
    if (!todayWellness) {
      items.push({
        id: 'wellness',
        icon: 'heart-circle-outline',
        title: 'Check in',
        subtitle: 'How are you feeling today?',
        color: '#EC4899',
        bg: '#FCE7F3',
        route: '/add-wellness',
      });
    }

    // Suggest reviewing finances
    const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
    const budgetUsed = budgets.reduce((s, b) => s + b.spent, 0);
    if (budgets.length === 0 || budgetUsed < totalBudget) {
      items.push({
        id: 'finance',
        icon: 'wallet-outline',
        title: 'Plan finances',
        subtitle: 'Review your budget and savings',
        color: '#10B981',
        bg: '#D1FAE5',
        route: '/budget',
      });
    }

    // Suggest journal if no entries recently
    if (items.length < 4) {
      items.push({
        id: 'journal',
        icon: 'book-outline',
        title: 'Write a thought',
        subtitle: 'Capture your day in a journal',
        color: '#8B5CF6',
        bg: '#EDE9FE',
        route: '/journal',
      });
    }

    // Suggest adding an event if no events today
    if (todayEvents.length === 0) {
      items.push({
        id: 'event',
        icon: 'calendar-outline',
        title: 'Plan your day',
        subtitle: 'No events yet — add something fun',
        color: '#3B82F6',
        bg: '#DBEAFE',
        route: '/add-event',
      });
    }

    // Suggest settling up if there's a balance
    const { net } = getBalance();
    if (Math.abs(net) > 0 && mode !== 'single') {
      items.push({
        id: 'settle',
        icon: 'swap-horizontal-outline',
        title: 'Settle up',
        subtitle: 'You have an open balance',
        color: '#10B981',
        bg: '#D1FAE5',
        route: '/settle-up',
      });
    }

    // Suggest date ideas for couples
    if (mode === 'couple' && items.length < 5) {
      items.push({
        id: 'date',
        icon: 'sparkles-outline',
        title: 'Date night?',
        subtitle: 'Browse ideas for your next outing',
        color: '#EC4899',
        bg: '#FCE7F3',
        route: '/date-ideas',
      });
    }

    return items.slice(0, 5);
  }, [todayEvents, weekPlan, todayStr, mode, getBalance, getTodayEntry]);

  function renderHeader() {
    const hour = now.getHours();
    const firstName = currentUser.name.split(' ')[0];
    // Warmer, more personal greetings with time-of-day context
    const greetings = hour < 12
      ? [`Rise and shine, ${firstName}`, `Good morning, ${firstName}`, `Hey ${firstName}, ready for today?`]
      : hour < 17
        ? [`Hey ${firstName}`, `Good afternoon, ${firstName}`, `Hope you're having a great day, ${firstName}`]
        : [`Evening, ${firstName}`, `Winding down, ${firstName}?`, `Good evening, ${firstName}`];
    const timeGreeting = greetings[now.getDate() % greetings.length];

    return (
      <View style={styles.heroWrapper}>
        <GradientCard
          colors={modeTheme.gradient}
          style={styles.heroGradient}
          borderRadius={radius['2xl']}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroModePill}>
                <Ionicons
                  name={modeTheme.icon}
                  size={12}
                  color="#FFFFFF"
                />
                <Text style={styles.heroModePillText}>
                  {MODE_LABELS[mode]}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.heroBellBtn}
                activeOpacity={0.7}
                onPress={() => router.push('/notifications')}
              >
                <Ionicons
                  name="notifications-outline"
                  size={18}
                  color="rgba(255,255,255,0.9)"
                />
                {unreadCount > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.heroGreeting}>
              {timeGreeting} {hour < 12 ? '\u{1F324}\u{FE0F}' : hour < 17 ? '\u{2600}\u{FE0F}' : '\u{1F319}'}
            </Text>
            <Text style={styles.heroDateLabel}>
              {format(now, 'EEEE, MMMM d')}
            </Text>
            <View style={styles.heroSummaryRow}>
              <View style={styles.heroSummaryItem}>
                <Ionicons name="calendar" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={styles.heroSummaryText}>
                  {todayEvents.length} event{todayEvents.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.heroSummaryDot} />
              <View style={styles.heroSummaryItem}>
                <Ionicons name="checkmark-circle" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={styles.heroSummaryText}>
                  {tasks.filter(t => !t.completed).length} task{tasks.filter(t => !t.completed).length !== 1 ? 's' : ''} left
                </Text>
              </View>
            </View>
          </View>
        </GradientCard>
      </View>
    );
  }

  function renderDinnerCard() {
    const todayPlan = weekPlan.find((d) => d.date === todayStr);
    const dinnerMeal = todayPlan?.dinner ? getMealById(todayPlan.dinner) : undefined;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push('/meal-plan')}
        style={styles.dinnerCardOuter}
      >
        <LinearGradient
          colors={['#FFF8F0', '#FFFFFF'] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.dinnerGradient}
        >
          <View style={styles.dinnerLeft}>
            <Text style={styles.dinnerEmoji}>{dinnerMeal?.emoji || '\u{1F37D}\u{FE0F}'}</Text>
          </View>
          <View style={styles.dinnerContent}>
            <Text style={styles.dinnerLabel}>Meal plan</Text>
            <Text style={styles.dinnerTitle}>
              {dinnerMeal ? dinnerMeal.name : 'Tap to plan meals'}
            </Text>
            {dinnerMeal ? (
              <Text style={styles.dinnerMeta}>
                {dinnerMeal.prepTime} min {'\u00B7'} {dinnerMeal.servings} servings
              </Text>
            ) : (
              <Text style={styles.dinnerMeta}>
                Plan breakfast, lunch, dinner & snacks
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.warning} />
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // ════════════════════════════════════════════
  // SINGLE MODE -- "Your Day"
  // ════════════════════════════════════════════

  function renderSingleMode() {
    const todayWellness = getTodayEntry();
    const moodEmoji = todayWellness
      ? MOOD_EMOJIS[todayWellness.mood] || '\u{1F642}'
      : '\u{1F642}';

    const myEvents = todayEvents.filter((e) => e.createdBy === currentUser.id);
    const myTasks = tasks.filter(
      (t) => !t.completed && t.assignedTo === currentUser.id,
    );

    return (
      <>
        {/* Wellness Card */}
        {renderSectionHead('Wellness', {
          onAdd: () => router.push('/add-wellness' as any),
          showSeeAll: false,
        })}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => router.push('/add-wellness' as any)}
        >
          {!todayWellness ? (
            <View style={styles.wellnessEmptyState}>
              <View style={[styles.wellnessEmptyIcon, { backgroundColor: modeTheme.accent + '15' }]}>
                <Ionicons name="heart-circle-outline" size={28} color={modeTheme.accent} />
              </View>
              <Text style={styles.wellnessEmptyTitle}>How are you today?</Text>
              <Text style={styles.wellnessEmptyDesc}>
                Tap to log your mood, sleep hours, and water intake
              </Text>
              <View style={[styles.wellnessLogBtn, { backgroundColor: modeTheme.accent }]}>
                <Ionicons name="add" size={14} color="#FFFFFF" />
                <Text style={styles.wellnessLogBtnText}>Log wellness</Text>
              </View>
            </View>
          ) : (
            <View style={styles.wellnessRow}>
              <View style={styles.wellnessStat}>
                <View style={[styles.wellnessCircle, { backgroundColor: '#FFF0F5' }]}>
                  <Text style={styles.wellnessEmoji}>{moodEmoji}</Text>
                </View>
                <Text style={styles.wellnessStatLabel}>Mood</Text>
              </View>
              <View style={styles.wellnessStat}>
                <View style={[styles.wellnessCircle, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={[styles.wellnessStatValue, { color: colors.primary }]}>
                    {todayWellness.sleep}h
                  </Text>
                </View>
                <Text style={styles.wellnessStatLabel}>Sleep</Text>
              </View>
              <View style={styles.wellnessStat}>
                <View style={[styles.wellnessCircle, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={[styles.wellnessStatValue, { color: colors.success }]}>
                    {todayWellness.water}
                  </Text>
                </View>
                <Text style={styles.wellnessStatLabel}>Water</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* What's for dinner? */}
        {renderDinnerCard()}

        {/* My Finances */}
        {renderSectionHead('My Finances', {
          onSeeAll: () => router.push({ pathname: '/(tabs)/lists', params: { section: 'money' } } as any),
          showSeeAll: expenses.length > 0,
          itemCount: expenses.length,
        })}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => router.push('/budget' as any)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={[styles.emptyStateIcon, { backgroundColor: '#FFF8E1' }]}>
              <Ionicons name="wallet-outline" size={22} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.headline, color: colors.text }}>
                {budgetOverview.totalLimit > 0
                  ? `${cs}${budgetOverview.remaining.toLocaleString()} left this month`
                  : 'Set up your budget'}
              </Text>
              <Text style={{ ...typography.caption1, color: colors.textTertiary, marginTop: 2 }}>
                {budgetOverview.totalLimit > 0
                  ? `${budgetOverview.spentPercent}% of ${cs}${budgetOverview.totalLimit.toLocaleString()} used`
                  : 'Track spending and stay on budget'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </View>
        </TouchableOpacity>

        {/* My Schedule */}
        {renderSectionHead('My Schedule', {
          onSeeAll: () => router.push('/(tabs)/calendar'),
          onAdd: () => router.push('/add-event'),
          showSeeAll: myEvents.length > 0,
          itemCount: myEvents.length,
        })}
        <View style={styles.card}>
          {myEvents.length === 0 ? (
            renderEmptyState(
              'calendar-outline',
              'Your day is open! Add something to look forward to.',
              'Add event',
              () => router.push('/add-event'),
            )
          ) : (
            myEvents.map((evt, idx) => (
              <TouchableOpacity
                key={evt.id}
                style={[
                  styles.timelineRow,
                  idx < myEvents.length - 1 && styles.timelineRowBorder,
                ]}
                onPress={() => router.push(`/event/${evt.id}`)}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.eventDot, { backgroundColor: evt.color }]}
                />
                <View style={[styles.timeBadge, { backgroundColor: `${evt.color}26` }]}>
                  <Text style={[styles.eventTime, { color: evt.color }]}>
                    {evt.allDay
                      ? 'All day'
                      : format(parseISO(evt.startDate), 'h:mm a')}
                  </Text>
                </View>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {evt.title}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* My Tasks */}
        {renderSectionHead('My Tasks', {
          onSeeAll: () => router.push({ pathname: '/(tabs)/lists', params: { section: 'tasks' } } as any),
          onAdd: () => router.push('/add-task'),
          showSeeAll: myTasks.length > 0,
          itemCount: myTasks.length,
        })}
        <View style={styles.card}>
          {myTasks.length === 0 ? (
            renderEmptyState(
              'checkmark-circle-outline',
              'Nothing on your plate right now. Enjoy the calm!',
              'Add task',
              () => router.push('/add-task'),
            )
          ) : (
            myTasks.map((task, idx) => (
              <View
                key={task.id}
                style={[
                  styles.taskRow,
                  idx < myTasks.length - 1 && styles.taskRowBorder,
                ]}
              >
                <TouchableOpacity
                  onPress={() => toggleTask(task.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.choreCheckbox}
                >
                  <View style={styles.checkCircle}>
                    {task.completed && (
                      <Ionicons
                        name="checkmark"
                        size={12}
                        color={colors.surface}
                      />
                    )}
                  </View>
                </TouchableOpacity>
                <Text style={styles.taskTitle} numberOfLines={1}>
                  {task.title}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Quick access to other features */}
        <MoreChips chips={[
          ...(habits.filter(h => h.frequency === 'daily').length > 0 ? [{
            icon: 'repeat-outline' as const,
            label: 'Habits',
            value: `${habits.filter(h => h.frequency === 'daily' && isCompletedToday(h.id)).length}/${habits.filter(h => h.frequency === 'daily').length} habits`,
            color: colors.primary,
            route: '/(tabs)/lists',
            params: { section: 'routines' },
          }] : []),
          ...(budgets.length > 0 ? [{
            icon: 'wallet-outline' as const,
            label: 'Budget',
            value: `${cs}${budgetOverview.remaining.toLocaleString()} left`,
            color: colors.warning,
            route: '/budget',
          }] : []),
          ...(totalUncheckedItems > 0 ? [{
            icon: 'cart-outline' as const,
            label: 'Shopping',
            value: `${totalUncheckedItems} items`,
            color: colors.success,
            route: '/(tabs)/lists',
            params: { section: 'shopping' },
          }] : []),
          ...(countdowns.length > 0 ? [{
            icon: 'time-outline' as const,
            label: countdowns[0].title,
            value: `${countdowns[0].daysUntil}d`,
            color: '#6366F1',
            route: '/(tabs)/lists',
            params: { section: 'tasks' },
          }] : []),
        ]} />

        <View style={styles.bottomSpacer} />
      </>
    );
  }

  // ══��═════════════════════════════════════════
  // COUPLE MODE -- "Our Day"
  // ════════════════════════════════════════════

  function renderCoupleMode() {
    const daysTogether = getDaysSinceTogether();

    const nextSharedEvent =
      todayEvents.find((e) => e.shared) ||
      events
        .filter(
          (e) =>
            e.shared &&
            e.startDate > format(now, "yyyy-MM-dd'T'HH:mm:ss"),
        )
        .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

    const alexEvents = todayEvents.filter(
      (e) => e.createdBy === currentUser.id,
    );
    const jordanEvents = todayEvents.filter(
      (e) => e.createdBy === partner.id,
    );

    const sharedTasks = tasks.filter((t) => !t.completed && t.shared);

    const hasPartner = partner.id !== '';

    return (
      <>
        {!hasPartner ? (
          /* Invite Partner Card */
          <View style={[styles.card, styles.inviteCard]}>
            <View style={styles.inviteIconWrap}>
              <Ionicons name="people-outline" size={32} color={modeTheme.accent} />
            </View>
            <Text style={styles.inviteTitle}>Invite your partner</Text>
            <Text style={styles.inviteSubtitle}>
              Share your life together — sync calendars, split tasks, and stay connected.
            </Text>
            <TouchableOpacity
              style={[styles.inviteBtn, { backgroundColor: modeTheme.accent }]}
              activeOpacity={0.7}
              onPress={() => router.push('/invite')}
            >
              <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
              <Text style={styles.inviteBtnText}>Send invite</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Relationship Card */
          <View style={[styles.card, styles.relationshipCard]}>
            <View style={styles.relationshipShimmer}>
              <LinearGradient
                colors={['transparent', '#FCE7F3', '#F9A8D4', '#FCE7F3', 'transparent'] as [string, string, ...string[]]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.shimmerGradient}
              />
            </View>
            <View style={styles.relationshipAvatars}>
              <Avatar
                name={currentUser.name}
                size={48}
                color={currentUser.color || colors.primary}
              />
              <View style={[styles.heartBadge, shadows.md]}>
                <Ionicons name="heart" size={20} color="#EC4899" />
              </View>
              <Avatar
                name={partner.name}
                size={48}
                color={partner.color || colors.success}
              />
            </View>
            <Text style={styles.daysTogether}>{daysTogether}</Text>
            <Text style={styles.daysTogetherLabel}>days together</Text>
            {nextSharedEvent && (
              <View style={styles.nextEventChip}>
                <Ionicons
                  name="calendar-outline"
                  size={12}
                  color={colors.textSecondary}
                />
                <Text style={styles.nextEventText} numberOfLines={1}>
                  Next: {nextSharedEvent.title}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Side-by-Side Schedule */}
        {renderSectionHead('Today\'s Schedule', {
          onSeeAll: () => router.push('/(tabs)/calendar'),
          onAdd: () => router.push('/add-event'),
          showSeeAll: alexEvents.length > 0 || jordanEvents.length > 0,
          itemCount: alexEvents.length + jordanEvents.length,
        })}
        <View style={styles.card}>
          {alexEvents.length === 0 && jordanEvents.length === 0 ? (
            renderEmptyState(
              'calendar-outline',
              'Your day is wide open! Why not plan something together?',
              'Add event',
              () => router.push('/add-event'),
            )
          ) : (
            <View style={styles.sideBySide}>
              {/* Your column */}
              <View style={styles.scheduleColumn}>
                <View style={styles.columnHeader}>
                  <Avatar
                    name={currentUser.name}
                    size={28}
                    color={currentUser.color || colors.primary}
                  />
                  <Text style={styles.columnName}>{currentUser.name}</Text>
                </View>
                {alexEvents.length === 0 ? (
                  <Text style={styles.emptyText}>Free today</Text>
                ) : (
                  alexEvents.map((evt) => (
                    <TouchableOpacity key={evt.id} style={styles.miniTimelineRow} onPress={() => router.push(`/event/${evt.id}`)} activeOpacity={0.7}>
                      <View
                        style={[
                          styles.miniDot,
                          { backgroundColor: evt.color },
                        ]}
                      />
                      <View style={styles.miniEventInfo}>
                        <Text style={styles.miniEventTime}>
                          {evt.allDay
                            ? 'All day'
                            : format(parseISO(evt.startDate), 'h:mm a')}
                        </Text>
                        <Text style={styles.miniEventTitle} numberOfLines={1}>
                          {evt.title}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              <View style={styles.columnDivider} />

              {/* Partner's column */}
              <View style={styles.scheduleColumn}>
                <View style={styles.columnHeader}>
                  <Avatar
                    name={partner.name}
                    size={28}
                    color={partner.color || colors.success}
                  />
                  <Text style={styles.columnName}>{partner.name}</Text>
                </View>
                {jordanEvents.length === 0 ? (
                  <Text style={styles.emptyText}>Free today</Text>
                ) : (
                  jordanEvents.map((evt) => (
                    <TouchableOpacity key={evt.id} style={styles.miniTimelineRow} onPress={() => router.push(`/event/${evt.id}`)} activeOpacity={0.7}>
                      <View
                        style={[
                          styles.miniDot,
                          { backgroundColor: evt.color },
                        ]}
                      />
                      <View style={styles.miniEventInfo}>
                        <Text style={styles.miniEventTime}>
                          {evt.allDay
                            ? 'All day'
                            : format(parseISO(evt.startDate), 'h:mm a')}
                        </Text>
                        <Text style={styles.miniEventTitle} numberOfLines={1}>
                          {evt.title}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
          )}
        </View>

        {/* Shared Tasks */}
        {renderSectionHead('Shared Tasks', {
          onSeeAll: () => router.push({ pathname: '/(tabs)/lists', params: { section: 'tasks' } } as any),
          onAdd: () => router.push('/add-task'),
          showSeeAll: sharedTasks.length > 0,
          itemCount: sharedTasks.length,
        })}
        <View style={styles.card}>
          {sharedTasks.length === 0 ? (
            renderEmptyState(
              'people-outline',
              'Team up! Add tasks you can tackle together.',
              'Add task',
              () => router.push('/add-task'),
            )
          ) : (
            sharedTasks.map((task, idx) => (
              <View
                key={task.id}
                style={[
                  styles.sharedTaskRow,
                  idx < sharedTasks.length - 1 && styles.taskRowBorder,
                ]}
              >
                <Avatar
                  name={
                    task.assignedTo
                      ? getUserName(task.assignedTo)
                      : 'Unassigned'
                  }
                  size={24}
                  color={
                    task.assignedTo
                      ? getUserColor(task.assignedTo)
                      : colors.textTertiary
                  }
                />
                <Text style={styles.taskTitle} numberOfLines={1}>
                  {task.title}
                </Text>
                <TouchableOpacity
                  onPress={() => toggleTask(task.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.choreCheckbox}
                >
                  <View style={styles.checkCircle}>
                    {task.completed && (
                      <Ionicons
                        name="checkmark"
                        size={12}
                        color={colors.surface}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Balance Card */}
        <View style={styles.sectionGap} />
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#FCE7F3' }]}>
              <Ionicons
                name="swap-horizontal-outline"
                size={20}
                color="#EC4899"
              />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryTitle}>Balance</Text>
              <Text style={styles.summarySub}>{balanceData.label}</Text>
            </View>
            <Text
              style={[
                styles.balanceAmount,
                {
                  color:
                    balanceData.netBalance > 0
                      ? colors.success
                      : balanceData.netBalance < 0
                        ? colors.error
                        : colors.textSecondary,
                },
              ]}
            >
              {cs}{balanceData.amount.toFixed(2)}
            </Text>
          </View>
          {balanceData.total > 0 && (
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(
                      balanceData.netBalance >= 0
                        ? 50 +
                          (balanceData.netBalance / (balanceData.total * 2)) *
                            50
                        : 50 -
                          (Math.abs(balanceData.netBalance) /
                            (balanceData.total * 2)) *
                            50,
                      100,
                    )}%`,
                    backgroundColor:
                      balanceData.netBalance >= 0
                        ? colors.success
                        : colors.error,
                  },
                ]}
              />
            </View>
          )}
        </View>

        {/* Quick access to other features */}
        <MoreChips chips={[
          ...(totalUncheckedItems > 0 ? [{
            icon: 'cart-outline' as const,
            label: 'Shopping',
            value: `${totalUncheckedItems} items`,
            color: colors.success,
            route: '/(tabs)/lists',
            params: { section: 'shopping' },
          }] : []),
          ...(habits.filter(h => h.frequency === 'daily').length > 0 ? [{
            icon: 'repeat-outline' as const,
            label: 'Habits',
            value: `${habits.filter(h => h.frequency === 'daily' && isCompletedToday(h.id)).length}/${habits.filter(h => h.frequency === 'daily').length}`,
            color: colors.primary,
            route: '/(tabs)/lists',
            params: { section: 'routines' },
          }] : []),
          ...(countdowns.length > 0 ? [{
            icon: 'time-outline' as const,
            label: countdowns[0].title,
            value: `${countdowns[0].daysUntil}d`,
            color: '#6366F1',
            route: '/(tabs)/lists',
            params: { section: 'tasks' },
          }] : []),
        ]} />

        <View style={styles.bottomSpacer} />
      </>
    );
  }

  // ════════════════════════════════════════════
  // FAMILY MODE -- "Family Hub"
  // ════════════════════════════════════════════

  function renderFamilyMode() {
    return (
      <>
        {/* Family Circle */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Family</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.familyCircleRow}
          >
            {allFamilyMembers.map((member) => {
              const hasEventsToday = todayEvents.some(
                (e) => e.createdBy === member.id,
              );
              return (
                <View key={member.id} style={styles.familyCircleMember}>
                  <View style={styles.avatarContainer}>
                    <Avatar
                      name={member.name}
                      size={44}
                      color={member.color}
                    />
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: hasEventsToday
                            ? colors.success
                            : colors.textTertiary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.familyCircleName} numberOfLines={1}>
                    {member.name}
                  </Text>
                </View>
              );
            })}
            {/* Invite button */}
            <TouchableOpacity
              style={styles.familyCircleMember}
              onPress={() => router.push('/invite')}
              activeOpacity={0.7}
            >
              <View style={styles.inviteAvatarCircle}>
                <Ionicons name="person-add" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.familyCircleName, { color: colors.primary }]} numberOfLines={1}>
                Invite
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* What's for dinner? */}
        {renderDinnerCard()}

        {/* Household Finances */}
        {renderSectionHead('Household Finances', {
          onSeeAll: () => router.push({ pathname: '/(tabs)/lists', params: { section: 'money' } } as any),
          showSeeAll: expenses.length > 0,
          itemCount: expenses.length,
        })}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <TouchableOpacity
              style={{ flex: 1, alignItems: 'center', padding: spacing.md, backgroundColor: colors.primaryLight, borderRadius: radius.lg }}
              onPress={() => router.push('/settle-up')}
              activeOpacity={0.7}
            >
              <Ionicons name="swap-horizontal-outline" size={22} color={colors.primary} />
              <Text style={{ ...typography.caption1, color: colors.primary, fontWeight: '600', marginTop: spacing.xs }}>
                Settle Up
              </Text>
              <Text style={{ ...typography.headline, color: colors.text, marginTop: 2 }}>
                {cs}{Math.abs(getBalance().net).toFixed(0)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, alignItems: 'center', padding: spacing.md, backgroundColor: '#FFF8E1', borderRadius: radius.lg }}
              onPress={() => router.push('/budget' as any)}
              activeOpacity={0.7}
            >
              <Ionicons name="pie-chart-outline" size={22} color={colors.warning} />
              <Text style={{ ...typography.caption1, color: colors.warning, fontWeight: '600', marginTop: spacing.xs }}>
                Budget
              </Text>
              <Text style={{ ...typography.headline, color: colors.text, marginTop: 2 }}>
                {budgetOverview.totalLimit > 0 ? `${budgetOverview.spentPercent}%` : '--'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, alignItems: 'center', padding: spacing.md, backgroundColor: '#ECFDF5', borderRadius: radius.lg }}
              onPress={() => router.push('/savings' as any)}
              activeOpacity={0.7}
            >
              <Ionicons name="trending-up-outline" size={22} color={colors.success} />
              <Text style={{ ...typography.caption1, color: colors.success, fontWeight: '600', marginTop: spacing.xs }}>
                Savings
              </Text>
              <Text style={{ ...typography.headline, color: colors.text, marginTop: 2 }}>
                Goals
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Per-Member Schedule Cards */}
        {renderSectionHead('Today\'s Schedule', {
          onSeeAll: () => router.push('/(tabs)/calendar'),
          onAdd: () => router.push('/add-event'),
        })}
        {familyMemberSchedules.length === 0 || familyMemberSchedules.every(({ events: me }) => me.length === 0) ? (
          <View style={styles.card}>
            {renderEmptyState(
              'calendar-outline',
              'A free day for the family! Plan something fun together.',
              'Add event',
              () => router.push('/add-event'),
            )}
          </View>
        ) : (
          familyMemberSchedules.filter(({ events: me }) => me.length > 0).map(({ member, events: memberEvents }) => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.memberHeader}>
              <Avatar name={member.name} size={32} color={member.color} />
              <Text style={styles.memberName}>{member.name}</Text>
            </View>
            {memberEvents.length === 0 ? (
              <Text style={styles.emptyText}>Nothing scheduled</Text>
            ) : (
              memberEvents.map((evt) => (
                <TouchableOpacity key={evt.id} style={styles.timelineRow} onPress={() => router.push(`/event/${evt.id}`)} activeOpacity={0.7}>
                  <View
                    style={[styles.eventDot, { backgroundColor: evt.color }]}
                  />
                  <Text style={styles.eventTime}>
                    {evt.allDay
                      ? 'All day'
                      : format(parseISO(evt.startDate), 'h:mm a')}
                  </Text>
                  <Text style={styles.eventTitle} numberOfLines={1}>
                    {evt.title}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )))}

        {/* Chores Board */}
        {chores.length > 0 && (
          <>
            {renderSectionHead('Chores Board', {
              onSeeAll: () => router.push('/(tabs)/lists'),
              onAdd: () => router.push('/add-task'),
            })}
            <View style={styles.card}>
              {chores.map((chore, idx) => (
                <View
                  key={chore.id}
                  style={[
                    styles.choreRow,
                    idx < chores.length - 1 && styles.choreRowBorder,
                  ]}
                >
                  <Avatar
                    name={
                      chore.assignedTo
                        ? getUserName(chore.assignedTo)
                        : 'Unassigned'
                    }
                    size={24}
                    color={
                      chore.assignedTo
                        ? getUserColor(chore.assignedTo)
                        : colors.textTertiary
                    }
                  />
                  <Text style={styles.choreTitle} numberOfLines={1}>
                    {chore.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => toggleTask(chore.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.choreCheckbox}
                  >
                    <View style={styles.checkCircle}>
                      {chore.completed && (
                        <Ionicons
                          name="checkmark"
                          size={12}
                          color={colors.surface}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Quick access to other features */}
        <MoreChips chips={[
          ...(budgets.length > 0 ? [{
            icon: 'wallet-outline' as const,
            label: 'Budget',
            value: `${cs}${budgetOverview.remaining.toLocaleString()} left`,
            color: colors.warning,
            route: '/budget',
          }] : []),
          ...(totalUncheckedItems > 0 ? [{
            icon: 'cart-outline' as const,
            label: 'Shopping',
            value: `${totalUncheckedItems} items`,
            color: colors.success,
            route: '/(tabs)/lists',
            params: { section: 'shopping' },
          }] : []),
          ...(countdowns.length > 0 ? [{
            icon: 'time-outline' as const,
            label: countdowns[0].title,
            value: `${countdowns[0].daysUntil}d`,
            color: '#6366F1',
            route: '/(tabs)/lists',
            params: { section: 'tasks' },
          }] : []),
          ...(habits.filter(h => h.frequency === 'daily').length > 0 ? [{
            icon: 'repeat-outline' as const,
            label: 'Habits',
            value: `${habits.filter(h => h.frequency === 'daily' && isCompletedToday(h.id)).length}/${habits.filter(h => h.frequency === 'daily').length}`,
            color: colors.primary,
            route: '/(tabs)/lists',
            params: { section: 'routines' },
          }] : []),
        ]} />

        <View style={styles.bottomSpacer} />
      </>
    );
  }

  // ════════════════════════════════════════════
  // PARENTING MODE -- "Kids Corner"
  // ════════════════════════════════════════════

  function renderParentingMode() {
    const olderChild = householdChildren.length > 0 ? householdChildren[0] : undefined;
    const baby = householdChildren.length > 1 ? householdChildren[1] : undefined;

    const childIds = new Set(householdChildren.map((c) => c.id));

    const olderChildEvents = olderChild
      ? todayEvents.filter((e) => e.createdBy === olderChild.id)
      : [];
    const olderChildTasks = olderChild
      ? tasks.filter((t) => !t.completed && t.assignedTo === olderChild.id)
      : [];

    const kidsChores = chores.filter(
      (c) => c.assignedTo && childIds.has(c.assignedTo),
    );

    const alexEvents = todayEvents.filter(
      (e) => e.createdBy === currentUser.id,
    );
    const jordanEvents = todayEvents.filter(
      (e) => e.createdBy === partner.id,
    );

    return (
      <>
        {/* Baby Tracker Card */}
        {baby && (
          <View style={[styles.card, styles.premiumCard]}>
            <View style={styles.memberHeader}>
              <Avatar name={baby.name} size={36} color={baby.color} />
              <View>
                <Text style={styles.memberName}>{baby.name}'s Tracker</Text>
                <Text style={styles.babyTrackerSub}>Today's logs</Text>
              </View>
            </View>
            <View style={styles.babyLogsList}>
              {babyLogs.lastFeed && (
                <View style={styles.babyLogRow}>
                  <Text style={styles.babyLogIcon}>{'\u{1F37C}'}</Text>
                  <View style={styles.babyLogInfo}>
                    <Text style={styles.babyLogTime}>
                      {format(
                        parseISO(babyLogs.lastFeed.timestamp),
                        'h:mm a',
                      )}
                    </Text>
                    <Text style={styles.babyLogNote} numberOfLines={1}>
                      {babyLogs.lastFeed.note || 'Feed'}
                    </Text>
                  </View>
                  {babyLogs.lastFeed.duration != null && (
                    <Text style={styles.babyLogDuration}>
                      {babyLogs.lastFeed.duration}min
                    </Text>
                  )}
                </View>
              )}
              {babyLogs.lastSleep && (
                <View style={styles.babyLogRow}>
                  <Text style={styles.babyLogIcon}>{'\u{1F4A4}'}</Text>
                  <View style={styles.babyLogInfo}>
                    <Text style={styles.babyLogTime}>
                      {format(
                        parseISO(babyLogs.lastSleep.timestamp),
                        'h:mm a',
                      )}
                    </Text>
                    <Text style={styles.babyLogNote} numberOfLines={1}>
                      {babyLogs.lastSleep.note || 'Sleep'}
                    </Text>
                  </View>
                  {babyLogs.lastSleep.duration != null && (
                    <Text style={styles.babyLogDuration}>
                      {babyLogs.lastSleep.duration}min
                    </Text>
                  )}
                </View>
              )}
              {babyLogs.lastDiaper && (
                <View style={styles.babyLogRow}>
                  <Text style={styles.babyLogIcon}>{'\u{1F9F7}'}</Text>
                  <View style={styles.babyLogInfo}>
                    <Text style={styles.babyLogTime}>
                      {format(
                        parseISO(babyLogs.lastDiaper.timestamp),
                        'h:mm a',
                      )}
                    </Text>
                    <Text style={styles.babyLogNote} numberOfLines={1}>
                      {babyLogs.lastDiaper.note || 'Diaper'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Older Child's Day Card */}
        {olderChild && (
          <>
            <View style={[styles.sectionHeader, styles.sectionGap]}>
              <View style={[styles.sectionDot, { backgroundColor: modeTheme.accent }]} />
              <Text style={styles.sectionTitle}>{olderChild.name}'s Day</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.memberHeader}>
                <Avatar name={olderChild.name} size={32} color={olderChild.color} />
                <Text style={styles.memberName}>{olderChild.name}</Text>
              </View>
              {olderChildEvents.length === 0 && olderChildTasks.length === 0 ? (
                <Text style={styles.emptyText}>Nothing scheduled</Text>
              ) : (
                <>
                  {olderChildEvents.map((evt) => (
                    <TouchableOpacity key={evt.id} style={styles.timelineRow} onPress={() => router.push(`/event/${evt.id}`)} activeOpacity={0.7}>
                      <View
                        style={[
                          styles.eventDot,
                          { backgroundColor: evt.color },
                        ]}
                      />
                      <Text style={styles.eventTime}>
                        {evt.allDay
                          ? 'All day'
                          : format(parseISO(evt.startDate), 'h:mm a')}
                      </Text>
                      <Text style={styles.eventTitle} numberOfLines={1}>
                        {evt.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {olderChildTasks.map((task) => (
                    <View key={task.id} style={styles.taskRow}>
                      <TouchableOpacity
                        onPress={() => toggleTask(task.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.choreCheckbox}
                      >
                        <View style={styles.checkCircle}>
                          {task.completed && (
                            <Ionicons
                              name="checkmark"
                              size={12}
                              color={colors.surface}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                      <Text style={styles.taskTitle} numberOfLines={1}>
                        {task.title}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          </>
        )}

        {/* What's for dinner? */}
        {renderDinnerCard()}

        {/* Parents' Quick View */}
        {renderSectionHead('Parents\' Schedule', {
          onSeeAll: () => router.push('/(tabs)/calendar'),
          onAdd: () => router.push('/add-event'),
          showSeeAll: alexEvents.length > 0 || jordanEvents.length > 0,
          itemCount: alexEvents.length + jordanEvents.length,
        })}
        <View style={styles.card}>
          {alexEvents.length === 0 && jordanEvents.length === 0 ? (
            renderEmptyState(
              'calendar-outline',
              'Nothing on the parents\' calendar. Enjoy the downtime!',
              'Add event',
              () => router.push('/add-event'),
            )
          ) : (
            <View style={styles.sideBySide}>
              <View style={styles.scheduleColumn}>
                <View style={styles.columnHeader}>
                  <Avatar
                    name={currentUser.name}
                    size={24}
                    color={currentUser.color || colors.primary}
                  />
                  <Text style={styles.columnName}>{currentUser.name}</Text>
                </View>
                {alexEvents.length === 0 ? (
                  <Text style={styles.emptyText}>Free today</Text>
                ) : (
                  alexEvents.map((evt) => (
                    <TouchableOpacity key={evt.id} style={styles.miniTimelineRow} onPress={() => router.push(`/event/${evt.id}`)} activeOpacity={0.7}>
                      <View
                        style={[
                          styles.miniDot,
                          { backgroundColor: evt.color },
                        ]}
                      />
                      <View style={styles.miniEventInfo}>
                        <Text style={styles.miniEventTime}>
                          {evt.allDay
                            ? 'All day'
                            : format(parseISO(evt.startDate), 'h:mm a')}
                        </Text>
                        <Text style={styles.miniEventTitle} numberOfLines={1}>
                          {evt.title}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
              <View style={styles.columnDivider} />
              <View style={styles.scheduleColumn}>
                <View style={styles.columnHeader}>
                  <Avatar
                    name={partner.name}
                    size={24}
                    color={partner.color || colors.success}
                  />
                  <Text style={styles.columnName}>{partner.name}</Text>
                </View>
                {jordanEvents.length === 0 ? (
                  <Text style={styles.emptyText}>Free today</Text>
                ) : (
                  jordanEvents.map((evt) => (
                    <TouchableOpacity key={evt.id} style={styles.miniTimelineRow} onPress={() => router.push(`/event/${evt.id}`)} activeOpacity={0.7}>
                      <View
                        style={[
                          styles.miniDot,
                          { backgroundColor: evt.color },
                        ]}
                      />
                      <View style={styles.miniEventInfo}>
                        <Text style={styles.miniEventTime}>
                          {evt.allDay
                            ? 'All day'
                            : format(parseISO(evt.startDate), 'h:mm a')}
                        </Text>
                        <Text style={styles.miniEventTitle} numberOfLines={1}>
                          {evt.title}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
          )}
        </View>

        {/* Quick access to other features */}
        <MoreChips chips={[
          ...(kidsChores.length > 0 ? [{
            icon: 'checkmark-done-outline' as const,
            label: 'Kids\' chores',
            value: `${kidsChores.length} chores`,
            color: colors.success,
            route: '/(tabs)/lists',
            params: { section: 'tasks' },
          }] : []),
          ...(bedtimeCountdown && bedtimeChild ? [{
            icon: 'moon-outline' as const,
            label: `${bedtimeChild.name}'s bedtime`,
            value: `${bedtimeCountdown.hours}h ${bedtimeCountdown.minutes}m`,
            color: '#8B5CF6',
            route: '/(tabs)/lists',
            params: { section: 'routines' },
          }] : []),
          ...(budgets.length > 0 ? [{
            icon: 'wallet-outline' as const,
            label: 'Budget',
            value: `${cs}${budgetOverview.remaining.toLocaleString()} left`,
            color: colors.warning,
            route: '/budget',
          }] : []),
          ...(countdowns.length > 0 ? [{
            icon: 'time-outline' as const,
            label: countdowns[0].title,
            value: `${countdowns[0].daysUntil}d`,
            color: '#6366F1',
            route: '/(tabs)/lists',
            params: { section: 'tasks' },
          }] : []),
        ]} />

        <View style={styles.bottomSpacer} />
      </>
    );
  }

  // ════════════════════════════════════════════
  // MAIN RENDER
  // ════════════════════════════════════════════

  function renderModeContent() {
    switch (mode) {
      case 'single':
        return renderSingleMode();
      case 'couple':
        return renderCoupleMode();
      case 'family':
        return renderFamilyMode();
      case 'parenting':
        return renderParentingMode();
      default:
        return renderCoupleMode();
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {renderHeader()}
        <CircleSwitcher />
        <Suggestions suggestions={suggestions} />
        {renderModeContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
  },

  // -- Hero Header --
  heroWrapper: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  heroGradient: {
    ...shadows.lg,
  },
  heroContent: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 28,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  heroGreeting: {
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 32,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: spacing.sm,
  },
  heroName: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroDateLabel: {
    ...typography.subhead,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.md,
  },
  heroSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: spacing.sm,
  },
  heroSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroSummaryText: {
    ...typography.caption1,
    color: 'rgba(255,255,255,0.85)',
  },
  heroSummaryDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  heroBellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroModePillText: {
    ...typography.caption2,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.error,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },

  // -- Section headers --
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionTitle: {
    ...typography.title3,
    color: colors.text,
    flex: 1,
  },
  sectionLink: {
    ...typography.subhead,
    color: colors.primary,
  },
  sectionGap: {
    marginTop: spacing.xl,
  },

  // -- Shared card style --
  card: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 22,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#F0F2F5',
    ...shadows.sm,
  },
  cardLabel: {
    ...typography.caption1,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  premiumCard: {
    ...shadows.md,
  },

  // -- Section add button --
  sectionAddBtn: {
    marginLeft: spacing.xs,
  },

  // -- Empty state text (legacy) --
  emptyText: {
    ...typography.callout,
    color: colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.md,
  },

  // -- Actionable empty state --
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyStateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyStateText: {
    ...typography.callout,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 220,
    lineHeight: 20,
  },
  emptyStateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    marginTop: spacing.xs,
  },
  emptyStateBtnText: {
    ...typography.subhead,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // -- Timeline / event rows --
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  timelineRowBorder: {
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timeBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  eventTime: {
    ...typography.caption1,
    color: colors.textSecondary,
  },
  eventTitle: {
    ...typography.callout,
    color: colors.text,
    flex: 1,
  },

  // -- Task rows --
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  taskRowBorder: {
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  taskTitle: {
    ...typography.callout,
    color: colors.text,
    flex: 1,
  },
  sharedTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },

  // -- Wellness (Single Mode) --
  wellnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  wellnessStat: {
    alignItems: 'center',
    flex: 1,
  },
  wellnessCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  wellnessEmoji: {
    fontSize: 28,
  },
  wellnessStatValue: {
    ...typography.title2,
    color: colors.text,
  },
  wellnessStatLabel: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  wellnessEmptyState: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  wellnessEmptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  wellnessEmptyTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: 4,
  },
  wellnessEmptyDesc: {
    ...typography.callout,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  wellnessLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  wellnessLogBtnText: {
    ...typography.subhead,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // -- Insights (Single Mode) --
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  insightRowBorder: {
    paddingBottom: spacing.md,
    marginBottom: spacing.sm,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    ...typography.headline,
    color: colors.text,
  },
  insightDesc: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // -- Relationship Card (Couple Mode) --
  inviteCard: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    ...shadows.md,
  },
  inviteIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  inviteTitle: {
    ...typography.title3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  inviteSubtitle: {
    ...typography.subhead,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  inviteBtnText: {
    ...typography.subhead,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  relationshipCard: {
    alignItems: 'center',
    overflow: 'hidden',
    ...shadows.md,
  },
  relationshipShimmer: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    height: 3,
    overflow: 'hidden',
    borderRadius: 1.5,
  },
  shimmerGradient: {
    flex: 1,
  },
  relationshipAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    zIndex: 2,
  },
  heartBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FCE7F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -6,
    zIndex: 1,
  },
  daysTogether: {
    ...heroTypography.display,
    color: colors.text,
  },
  daysTogetherLabel: {
    ...typography.caption1,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  nextEventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#F5F7FA',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  nextEventText: {
    ...typography.caption1,
    color: colors.textSecondary,
  },

  // -- Side-by-Side Schedule (Couple & Parenting) --
  sideBySide: {
    flexDirection: 'row',
  },
  scheduleColumn: {
    flex: 1,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  columnName: {
    ...typography.subhead,
    color: colors.text,
  },
  columnDivider: {
    width: 1,
    backgroundColor: '#F0F2F5',
    marginHorizontal: spacing.md,
  },
  miniTimelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
  },
  miniEventInfo: {
    flex: 1,
  },
  miniEventTime: {
    ...typography.caption2,
    color: colors.textTertiary,
  },
  miniEventTitle: {
    ...typography.caption1,
    color: colors.text,
    marginTop: 1,
  },

  // -- Balance Card (Couple Mode) --
  balanceAmount: {
    ...typography.headline,
  },

  // -- Summary rows (Shopping / Budget) --
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    ...typography.headline,
    color: colors.text,
  },
  summarySub: {
    ...typography.caption1,
    color: colors.textTertiary,
    marginTop: 2,
  },
  // -- Progress bar --
  progressBarTrack: {
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },

  // -- Member schedule cards (Family Mode) --
  memberCard: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 22,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#F0F2F5',
    ...shadows.sm,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  memberName: {
    ...typography.headline,
    color: colors.text,
  },

  // -- Family Circle (Family Mode) --
  familyCircleRow: {
    gap: spacing.lg,
    paddingVertical: spacing.xs,
  },
  familyCircleMember: {
    alignItems: 'center',
    width: 60,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.surface,
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  familyCircleName: {
    ...typography.caption2,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  inviteAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },

  // -- Chores --
  choreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  choreRowBorder: {
    paddingBottom: spacing.md,
    marginBottom: spacing.sm,
  },
  choreTitle: {
    ...typography.callout,
    color: colors.text,
    flex: 1,
  },
  choreCheckbox: {
    padding: spacing.sm,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // -- Baby Tracker (Parenting Mode) --
  babyTrackerSub: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  babyLogsList: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  babyLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#F5F7FA',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  babyLogIcon: {
    fontSize: 20,
  },
  babyLogInfo: {
    flex: 1,
  },
  babyLogTime: {
    ...typography.subhead,
    color: colors.text,
  },
  babyLogNote: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginTop: 1,
  },
  babyLogDuration: {
    ...typography.caption1,
    color: colors.textTertiary,
  },

  // -- Dinner Card --
  dinnerCardOuter: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F2F5',
    ...shadows.sm,
  },
  dinnerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 22,
    borderRadius: radius.xl,
  },
  dinnerLeft: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  dinnerEmoji: {
    fontSize: 28,
  },
  dinnerContent: {
    flex: 1,
  },
  dinnerLabel: {
    ...typography.caption1,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dinnerTitle: {
    ...typography.headline,
    color: colors.text,
    marginTop: 2,
  },
  dinnerMeta: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // -- Bottom spacer --
  bottomSpacer: {
    height: 90,
  },
});
