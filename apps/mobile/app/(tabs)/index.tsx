import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
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
} from '../../src/constants/theme';
import { Avatar } from '../../src/components/ui/Avatar';
import { useModeStore } from '../../src/stores/modeStore';
import { useCalendarStore } from '../../src/stores/calendarStore';
import { useTaskStore } from '../../src/stores/taskStore';
import { useListStore } from '../../src/stores/listStore';
import {
  currentUser,
  partner,
  household,
  mockChildren,
  mockBudgets,
  mockWellness,
  mockCountdowns,
  mockActivityFeed,
  mockBabyLogs,
  mockExpenses,
  mockInsights,
  familyMembers,
  getUserName,
  getUserColor,
  modeGreetings,
  getDaysSinceTogether,
} from '../../src/data/mock';

const MOOD_EMOJIS: Record<number, string> = {
  1: '\u{1F614}',
  2: '\u{1F610}',
  3: '\u{1F642}',
  4: '\u{1F60A}',
  5: '\u{1F929}',
};

const MODE_LABELS: Record<string, string> = {
  single: 'Personal',
  couple: 'Couple',
  family: 'Family',
  parenting: 'Parenting',
};

function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = parseISO(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDys = Math.floor(diffHrs / 24);
  return `${diffDys}d ago`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { mode } = useModeStore();
  const { events } = useCalendarStore();
  const { tasks, toggleTask } = useTaskStore();
  const { lists } = useListStore();

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
    const totalLimit = mockBudgets.reduce((s, b) => s + b.limit, 0);
    const totalSpent = mockBudgets.reduce((s, b) => s + b.spent, 0);
    const remaining = totalLimit - totalSpent;
    const spentRatio = totalLimit > 0 ? totalSpent / totalLimit : 0;
    const spentPercent = Math.round(spentRatio * 100);
    return { totalLimit, totalSpent, remaining, spentRatio, spentPercent };
  }, []);

  const countdowns = useMemo(() => {
    return mockCountdowns
      .map((c) => ({
        ...c,
        daysUntil: differenceInDays(parseISO(c.date), now),
      }))
      .filter((c) => c.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, []);

  const chores = useMemo(() => {
    return tasks.filter((t) => t.isChore && !t.completed);
  }, [tasks]);

  const recentActivity = useMemo(() => {
    return [...mockActivityFeed]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 3);
  }, []);

  // Couple mode: expense balance
  const balanceData = useMemo(() => {
    const unsettled = mockExpenses.filter((e) => !e.settled);
    let alexPaid = 0;
    let jordanPaid = 0;
    unsettled.forEach((expense) => {
      const splitAmount = expense.amount / expense.splitBetween.length;
      if (expense.paidBy === currentUser.id) {
        alexPaid += expense.amount - splitAmount;
      } else if (expense.paidBy === partner.id) {
        jordanPaid += expense.amount - splitAmount;
      }
    });
    const netBalance = alexPaid - jordanPaid;
    return {
      netBalance,
      label:
        netBalance > 0
          ? `${partner.name} owes you`
          : netBalance < 0
            ? `You owe ${partner.name}`
            : 'All settled',
      amount: Math.abs(netBalance),
      total: alexPaid + jordanPaid,
    };
  }, []);

  // Family mode: all members list
  const allFamilyMembers = useMemo(() => {
    return [
      { id: currentUser.id, name: currentUser.name, color: currentUser.color || colors.primary },
      { id: partner.id, name: partner.name, color: partner.color || colors.success },
      ...familyMembers.map((f) => ({ id: f.id, name: f.name, color: f.color })),
      ...mockChildren.map((c) => ({ id: c.id, name: c.name, color: c.color })),
    ];
  }, []);

  // Family mode: per-member schedules
  const familyMemberSchedules = useMemo(() => {
    return allFamilyMembers.map((member) => {
      const memberEvents = todayEvents.filter(
        (e) => e.createdBy === member.id,
      );
      return { member, events: memberEvents };
    });
  }, [allFamilyMembers, todayEvents]);

  // Parenting mode: Liam's baby logs
  const liamLogs = useMemo(() => {
    const logs = mockBabyLogs.filter(
      (l) => l.childId === 'child-2' && l.type !== 'milestone',
    );
    const lastFeed = logs
      .filter((l) => l.type === 'feed')
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    const lastSleep = logs
      .filter((l) => l.type === 'sleep')
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    const lastDiaper = logs
      .filter((l) => l.type === 'diaper')
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    return { lastFeed, lastSleep, lastDiaper };
  }, []);

  // Parenting mode: milestones
  const milestones = useMemo(() => {
    return mockBabyLogs.filter((l) => l.type === 'milestone');
  }, []);

  // Parenting mode: bedtime countdown for Emma
  const bedtimeCountdown = useMemo(() => {
    const emma = mockChildren.find((c) => c.id === 'child-1');
    if (!emma?.bedtime) return null;
    const bedtimeStr = emma.bedtime;
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
  }, []);

  // ════════════════════════════════════════════
  // SHARED RENDER HELPERS
  // ════════════════════════════════════════════

  function renderHeader() {
    const greeting = modeGreetings[mode];
    const subtitle =
      mode === 'couple'
        ? greeting.subtitle.replace('{partner}', partner.name)
        : greeting.subtitle;

    return (
      <View style={styles.headerArea}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.headerTopRow}>
              <Text style={styles.headerTitle}>{greeting.title}</Text>
              <View
                style={[
                  styles.modePill,
                  { backgroundColor: modeTheme.accentLight },
                ]}
              >
                <Ionicons
                  name={modeTheme.icon}
                  size={12}
                  color={modeTheme.accent}
                />
                <Text style={[styles.modePillText, { color: modeTheme.accent }]}>
                  {MODE_LABELS[mode]}
                </Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
          <TouchableOpacity
            style={styles.bellBtn}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert('Notifications', 'No new notifications')
            }
          >
            <Ionicons
              name="notifications-outline"
              size={18}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderBudgetCard(label?: string) {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push('/(tabs)/budget')}
      >
        <View style={styles.summaryRow}>
          <View style={[styles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="wallet-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryTitle}>{label || 'Budget'}</Text>
            <Text style={styles.summarySub}>
              ${budgetOverview.remaining.toLocaleString()} left this month
            </Text>
          </View>
          <Text style={styles.budgetPercent}>
            {budgetOverview.spentPercent}%
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(budgetOverview.spentPercent, 100)}%`,
                backgroundColor:
                  budgetOverview.spentPercent > 90
                    ? colors.error
                    : budgetOverview.spentPercent > 70
                      ? colors.warning
                      : colors.primary,
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  }

  function renderShoppingCard() {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push('/(tabs)/lists')}
      >
        <View style={styles.summaryRow}>
          <View style={[styles.iconCircle, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="cart-outline" size={20} color={colors.success} />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryTitle}>Shopping</Text>
            <Text style={styles.summarySub}>
              {totalUncheckedItems} item{totalUncheckedItems !== 1 ? 's' : ''}{' '}
              needed
            </Text>
          </View>
          <Text style={styles.viewLink}>View</Text>
        </View>
      </TouchableOpacity>
    );
  }

  function renderCountdowns() {
    if (countdowns.length === 0) return null;
    return (
      <>
        <View style={[styles.sectionHeader, styles.sectionGap]}>
          <Text style={styles.sectionTitle}>Coming Up</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.countdownScroll}
        >
          {countdowns.map((cd) => (
            <View key={cd.id} style={styles.countdownCard}>
              <Text style={styles.countdownEmoji}>{cd.emoji}</Text>
              <Text style={styles.countdownTitle} numberOfLines={1}>
                {cd.title}
              </Text>
              <Text style={styles.countdownDays}>
                {cd.daysUntil} day{cd.daysUntil !== 1 ? 's' : ''}
              </Text>
            </View>
          ))}
        </ScrollView>
      </>
    );
  }

  // ════════════════════════════════════════════
  // SINGLE MODE -- "Your Day"
  // ════════════════════════════════════════════

  function renderSingleMode() {
    const todayWellness = mockWellness[0];
    const moodEmoji = todayWellness
      ? MOOD_EMOJIS[todayWellness.mood] || '\u{1F642}'
      : '\u{1F642}';

    const myEvents = todayEvents.filter((e) => e.createdBy === currentUser.id);
    const myTasks = tasks.filter(
      (t) => !t.completed && t.assignedTo === currentUser.id,
    );
    const todayInsights = mockInsights.slice(0, 2);

    return (
      <>
        {/* Wellness Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Wellness</Text>
          <View style={styles.wellnessRow}>
            <View style={styles.wellnessStat}>
              <Text style={styles.wellnessEmoji}>{moodEmoji}</Text>
              <Text style={styles.wellnessStatLabel}>Mood</Text>
            </View>
            <View style={styles.wellnessDivider} />
            <View style={styles.wellnessStat}>
              <Text style={styles.wellnessStatValue}>
                {todayWellness ? todayWellness.sleep : '--'}h
              </Text>
              <Text style={styles.wellnessStatLabel}>Sleep</Text>
            </View>
            <View style={styles.wellnessDivider} />
            <View style={styles.wellnessStat}>
              <Text style={styles.wellnessStatValue}>
                {todayWellness ? todayWellness.water : '--'}
              </Text>
              <Text style={styles.wellnessStatLabel}>Glasses</Text>
            </View>
          </View>
        </View>

        {/* My Schedule */}
        <View style={[styles.sectionHeader, styles.sectionGap]}>
          <Text style={styles.sectionTitle}>My Schedule</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/calendar')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.sectionLink}>See all</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          {myEvents.length === 0 ? (
            <Text style={styles.emptyText}>No events today</Text>
          ) : (
            myEvents.map((evt, idx) => (
              <View
                key={evt.id}
                style={[
                  styles.timelineRow,
                  idx < myEvents.length - 1 && styles.timelineRowBorder,
                ]}
              >
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
              </View>
            ))
          )}
        </View>

        {/* My Tasks */}
        <View style={[styles.sectionHeader, styles.sectionGap]}>
          <Text style={styles.sectionTitle}>My Tasks</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/tasks')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.sectionLink}>See all</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          {myTasks.length === 0 ? (
            <Text style={styles.emptyText}>All caught up!</Text>
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

        {/* Personal Budget */}
        <View style={styles.sectionGap} />
        {renderBudgetCard('Personal Budget')}

        {/* Insights Card */}
        {todayInsights.length > 0 && (
          <>
            <View style={[styles.sectionHeader, styles.sectionGap]}>
              <Text style={styles.sectionTitle}>Insights</Text>
            </View>
            <View style={styles.card}>
              {todayInsights.map((insight, idx) => (
                <View
                  key={insight.id}
                  style={[
                    styles.insightRow,
                    idx < todayInsights.length - 1 && styles.insightRowBorder,
                  ]}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor:
                          insight.type === 'achievement'
                            ? '#D1FAE5'
                            : insight.type === 'reminder'
                              ? '#FEF3C7'
                              : '#DBEAFE',
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        insight.icon === 'trophy'
                          ? 'trophy-outline'
                          : insight.icon === 'gift'
                            ? 'gift-outline'
                            : insight.icon === 'lightbulb'
                              ? 'bulb-outline'
                              : insight.icon === 'trending-down'
                                ? 'trending-down-outline'
                                : 'heart-outline'
                      }
                      size={18}
                      color={
                        insight.type === 'achievement'
                          ? colors.success
                          : insight.type === 'reminder'
                            ? colors.warning
                            : colors.primary
                      }
                    />
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <Text style={styles.insightDesc}>
                      {insight.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.bottomSpacer} />
      </>
    );
  }

  // ════════════════════════════════════════════
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

    return (
      <>
        {/* Relationship Card */}
        <View style={[styles.card, styles.relationshipCard]}>
          <View style={styles.relationshipAvatars}>
            <Avatar
              name={currentUser.name}
              size={48}
              color={currentUser.color || colors.primary}
            />
            <View style={styles.heartBadge}>
              <Ionicons name="heart" size={16} color="#EC4899" />
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

        {/* Side-by-Side Schedule */}
        <View style={[styles.sectionHeader, styles.sectionGap]}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/calendar')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.sectionLink}>See all</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <View style={styles.sideBySide}>
            {/* Alex's column */}
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
                  <View key={evt.id} style={styles.miniTimelineRow}>
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
                  </View>
                ))
              )}
            </View>

            <View style={styles.columnDivider} />

            {/* Jordan's column */}
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
                  <View key={evt.id} style={styles.miniTimelineRow}>
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
                  </View>
                ))
              )}
            </View>
          </View>
        </View>

        {/* Shared Tasks */}
        <View style={[styles.sectionHeader, styles.sectionGap]}>
          <Text style={styles.sectionTitle}>Shared Tasks</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/tasks')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.sectionLink}>See all</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          {sharedTasks.length === 0 ? (
            <Text style={styles.emptyText}>No shared tasks</Text>
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
              ${balanceData.amount.toFixed(2)}
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

        {/* Shopping Summary */}
        {renderShoppingCard()}

        {/* Coming Up */}
        {renderCountdowns()}

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
          </ScrollView>
        </View>

        {/* Per-Member Schedule Cards */}
        <View style={[styles.sectionHeader, styles.sectionGap]}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/calendar')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.sectionLink}>See all</Text>
          </TouchableOpacity>
        </View>
        {familyMemberSchedules.map(({ member, events: memberEvents }) => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.memberHeader}>
              <Avatar name={member.name} size={32} color={member.color} />
              <Text style={styles.memberName}>{member.name}</Text>
            </View>
            {memberEvents.length === 0 ? (
              <Text style={styles.emptyText}>Free today</Text>
            ) : (
              memberEvents.map((evt) => (
                <View key={evt.id} style={styles.timelineRow}>
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
                </View>
              ))
            )}
          </View>
        ))}

        {/* Chores Board */}
        {chores.length > 0 && (
          <>
            <View style={[styles.sectionHeader, styles.sectionGap]}>
              <Text style={styles.sectionTitle}>Chores Board</Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/tasks')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.sectionLink}>See all</Text>
              </TouchableOpacity>
            </View>
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

        {/* Family Budget */}
        <View style={styles.sectionGap} />
        {renderBudgetCard('Family Budget')}

        {/* Shopping */}
        {renderShoppingCard()}

        {/* Countdowns */}
        {renderCountdowns()}

        {/* Activity Feed */}
        {recentActivity.length > 0 && (
          <>
            <View style={[styles.sectionHeader, styles.sectionGap]}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>
            <View style={styles.card}>
              {recentActivity.map((item, idx) => (
                <View
                  key={item.id}
                  style={[
                    styles.activityRow,
                    idx < recentActivity.length - 1 &&
                      styles.activityRowBorder,
                  ]}
                >
                  <Avatar
                    name={getUserName(item.userId)}
                    size={28}
                    color={getUserColor(item.userId)}
                  />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText} numberOfLines={2}>
                      <Text style={styles.activityBold}>
                        {getUserName(item.userId)}
                      </Text>{' '}
                      {item.detail}
                    </Text>
                    <Text style={styles.activityTime}>
                      {getRelativeTime(item.timestamp)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.bottomSpacer} />
      </>
    );
  }

  // ════════════════════════════════════════════
  // PARENTING MODE -- "Kids Corner"
  // ════════════════════════════════════════════

  function renderParentingMode() {
    const liam = mockChildren.find((c) => c.id === 'child-2');
    const emma = mockChildren.find((c) => c.id === 'child-1');

    const emmaEvents = todayEvents.filter((e) => e.createdBy === 'child-1');
    const emmaTasks = tasks.filter(
      (t) => !t.completed && t.assignedTo === 'child-1',
    );

    const kidsChores = chores.filter(
      (c) => c.assignedTo === 'child-1' || c.assignedTo === 'child-2',
    );

    const alexEvents = todayEvents.filter(
      (e) => e.createdBy === currentUser.id,
    );
    const jordanEvents = todayEvents.filter(
      (e) => e.createdBy === partner.id,
    );

    return (
      <>
        {/* Baby Tracker Card (Liam) */}
        {liam && (
          <View style={[styles.card, styles.premiumCard]}>
            <View style={styles.memberHeader}>
              <Avatar name={liam.name} size={36} color={liam.color} />
              <View>
                <Text style={styles.memberName}>{liam.name}'s Tracker</Text>
                <Text style={styles.babyTrackerSub}>Today's logs</Text>
              </View>
            </View>
            <View style={styles.babyLogsList}>
              {liamLogs.lastFeed && (
                <View style={styles.babyLogRow}>
                  <Text style={styles.babyLogIcon}>{'\u{1F37C}'}</Text>
                  <View style={styles.babyLogInfo}>
                    <Text style={styles.babyLogTime}>
                      {format(
                        parseISO(liamLogs.lastFeed.timestamp),
                        'h:mm a',
                      )}
                    </Text>
                    <Text style={styles.babyLogNote} numberOfLines={1}>
                      {liamLogs.lastFeed.note || 'Feed'}
                    </Text>
                  </View>
                  {liamLogs.lastFeed.duration != null && (
                    <Text style={styles.babyLogDuration}>
                      {liamLogs.lastFeed.duration}min
                    </Text>
                  )}
                </View>
              )}
              {liamLogs.lastSleep && (
                <View style={styles.babyLogRow}>
                  <Text style={styles.babyLogIcon}>{'\u{1F4A4}'}</Text>
                  <View style={styles.babyLogInfo}>
                    <Text style={styles.babyLogTime}>
                      {format(
                        parseISO(liamLogs.lastSleep.timestamp),
                        'h:mm a',
                      )}
                    </Text>
                    <Text style={styles.babyLogNote} numberOfLines={1}>
                      {liamLogs.lastSleep.note || 'Sleep'}
                    </Text>
                  </View>
                  {liamLogs.lastSleep.duration != null && (
                    <Text style={styles.babyLogDuration}>
                      {liamLogs.lastSleep.duration}min
                    </Text>
                  )}
                </View>
              )}
              {liamLogs.lastDiaper && (
                <View style={styles.babyLogRow}>
                  <Text style={styles.babyLogIcon}>{'\u{1F9F7}'}</Text>
                  <View style={styles.babyLogInfo}>
                    <Text style={styles.babyLogTime}>
                      {format(
                        parseISO(liamLogs.lastDiaper.timestamp),
                        'h:mm a',
                      )}
                    </Text>
                    <Text style={styles.babyLogNote} numberOfLines={1}>
                      {liamLogs.lastDiaper.note || 'Diaper'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Emma's Day Card */}
        {emma && (
          <>
            <View style={[styles.sectionHeader, styles.sectionGap]}>
              <Text style={styles.sectionTitle}>{emma.name}'s Day</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.memberHeader}>
                <Avatar name={emma.name} size={32} color={emma.color} />
                <Text style={styles.memberName}>{emma.name}</Text>
              </View>
              {emmaEvents.length === 0 && emmaTasks.length === 0 ? (
                <Text style={styles.emptyText}>Nothing scheduled</Text>
              ) : (
                <>
                  {emmaEvents.map((evt) => (
                    <View key={evt.id} style={styles.timelineRow}>
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
                    </View>
                  ))}
                  {emmaTasks.map((task) => (
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

        {/* Kids' Chores */}
        {kidsChores.length > 0 && (
          <>
            <View style={[styles.sectionHeader, styles.sectionGap]}>
              <Text style={styles.sectionTitle}>Kids' Chores</Text>
            </View>
            <View style={styles.card}>
              {kidsChores.map((chore, idx) => (
                <View
                  key={chore.id}
                  style={[
                    styles.choreRow,
                    idx < kidsChores.length - 1 && styles.choreRowBorder,
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

        {/* Growth Milestones */}
        {milestones.length > 0 && (
          <>
            <View style={[styles.sectionHeader, styles.sectionGap]}>
              <Text style={styles.sectionTitle}>Growth Milestones</Text>
            </View>
            <View style={styles.card}>
              {milestones.map((ms, idx) => (
                <View
                  key={ms.id}
                  style={[
                    styles.milestoneRow,
                    idx < milestones.length - 1 && styles.milestoneRowBorder,
                  ]}
                >
                  <Text style={styles.milestoneEmoji}>{'\u{2B50}'}</Text>
                  <View style={styles.milestoneInfo}>
                    <Text style={styles.milestoneNote}>{ms.note}</Text>
                    <Text style={styles.milestoneDate}>
                      {format(parseISO(ms.timestamp), 'MMM d, yyyy')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Bedtime Countdown */}
        {bedtimeCountdown && emma && (
          <>
            <View style={styles.sectionGap} />
            <View style={[styles.card, styles.bedtimeCard]}>
              <View style={styles.bedtimeRow}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: '#EDE9FE' },
                  ]}
                >
                  <Ionicons name="moon-outline" size={20} color="#8B5CF6" />
                </View>
                <View style={styles.summaryInfo}>
                  <Text style={styles.summaryTitle}>
                    {emma.name}'s Bedtime
                  </Text>
                  <Text style={styles.summarySub}>
                    In {bedtimeCountdown.hours}h {bedtimeCountdown.minutes}m
                  </Text>
                </View>
                <Text style={styles.bedtimeTime}>{emma.bedtime}</Text>
              </View>
            </View>
          </>
        )}

        {/* Parents' Quick View */}
        <View style={[styles.sectionHeader, styles.sectionGap]}>
          <Text style={styles.sectionTitle}>Parents' Schedule</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/calendar')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.sectionLink}>See all</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
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
                  <View key={evt.id} style={styles.miniTimelineRow}>
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
                  </View>
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
                  <View key={evt.id} style={styles.miniTimelineRow}>
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
                  </View>
                ))
              )}
            </View>
          </View>
        </View>

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
      >
        {renderHeader()}
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
    paddingBottom: spacing['3xl'],
  },

  // ── Header ──
  headerArea: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    ...typography.title1,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.callout,
    color: colors.textSecondary,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  modePillText: {
    ...typography.caption2,
    fontWeight: '600',
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    ...shadows.sm,
  },

  // ── Section headers ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text,
  },
  sectionLink: {
    ...typography.subhead,
    color: colors.primary,
  },
  sectionGap: {
    marginTop: spacing['2xl'],
  },

  // ── Shared card style ──
  card: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.md,
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

  // ── Empty state text ──
  emptyText: {
    ...typography.callout,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },

  // ── Timeline / event rows ──
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  timelineRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventTime: {
    ...typography.caption1,
    color: colors.textSecondary,
    width: 68,
  },
  eventTitle: {
    ...typography.callout,
    color: colors.text,
    flex: 1,
  },

  // ── Task rows ──
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  taskRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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

  // ── Wellness (Single Mode) ──
  wellnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  wellnessStat: {
    alignItems: 'center',
    flex: 1,
  },
  wellnessEmoji: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  wellnessStatValue: {
    ...typography.title2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  wellnessStatLabel: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  wellnessDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.borderLight,
  },

  // ── Insights (Single Mode) ──
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  insightRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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

  // ── Relationship Card (Couple Mode) ──
  relationshipCard: {
    alignItems: 'center',
    ...shadows.md,
  },
  relationshipAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heartBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FCE7F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -6,
    zIndex: 1,
  },
  daysTogether: {
    ...typography.largeTitle,
    color: colors.text,
    fontSize: 36,
    lineHeight: 42,
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
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  nextEventText: {
    ...typography.caption1,
    color: colors.textSecondary,
  },

  // ── Side-by-Side Schedule (Couple & Parenting) ──
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
    backgroundColor: colors.borderLight,
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

  // ── Balance Card (Couple Mode) ──
  balanceAmount: {
    ...typography.headline,
  },

  // ── Summary rows (Shopping / Budget) ──
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
  viewLink: {
    ...typography.subhead,
    color: colors.primary,
  },
  budgetPercent: {
    ...typography.subhead,
    color: colors.textSecondary,
  },

  // ── Budget progress bar ──
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

  // ── Member schedule cards (Family Mode) ──
  memberCard: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.md,
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

  // ── Family Circle (Family Mode) ──
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

  // ── Chores ──
  choreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  choreRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.md,
    marginBottom: spacing.sm,
  },
  choreTitle: {
    ...typography.callout,
    color: colors.text,
    flex: 1,
  },
  choreCheckbox: {
    padding: spacing.xs,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Countdowns ──
  countdownScroll: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  countdownCard: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.sm,
  },
  countdownEmoji: {
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  countdownTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  countdownDays: {
    ...typography.headline,
    color: colors.primary,
  },

  // ── Activity feed ──
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.md,
    marginBottom: spacing.sm,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    ...typography.callout,
    color: colors.text,
    lineHeight: 20,
  },
  activityBold: {
    fontWeight: '600',
  },
  activityTime: {
    ...typography.caption1,
    color: colors.textTertiary,
    marginTop: 2,
  },

  // ── Baby Tracker (Parenting Mode) ──
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
    backgroundColor: colors.background,
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

  // ── Milestones (Parenting Mode) ──
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  milestoneRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.md,
    marginBottom: spacing.sm,
  },
  milestoneEmoji: {
    fontSize: 20,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneNote: {
    ...typography.callout,
    color: colors.text,
  },
  milestoneDate: {
    ...typography.caption1,
    color: colors.textTertiary,
    marginTop: 2,
  },

  // ── Bedtime Card (Parenting Mode) ──
  bedtimeCard: {},
  bedtimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bedtimeTime: {
    ...typography.subhead,
    color: '#8B5CF6',
  },

  // ── Bottom spacer ──
  bottomSpacer: {
    height: 100,
  },
});
