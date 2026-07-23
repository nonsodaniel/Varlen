import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  format,
  parseISO,
  subDays,
  differenceInYears,
  differenceInDays,
} from 'date-fns';
import {
  typography,
  spacing,
  radius,
  heroTypography,
  modeThemes,
} from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Avatar } from '../../src/components/ui/Avatar';
import { getUserName, getUserColor } from '../../src/utils/userHelpers';
import { useAuthStore } from '../../src/stores/authStore';
import { useHouseholdStore } from '../../src/stores/householdStore';
import { useMemoryStore } from '../../src/stores/memoryStore';
import { useTimelineStore } from '../../src/stores/timelineStore';
import { usePollStore } from '../../src/stores/pollStore';
import { useModeStore } from '../../src/stores/modeStore';
import { useTaskStore } from '../../src/stores/taskStore';
import { useCalendarStore } from '../../src/stores/calendarStore';
import { useExpenseStore } from '../../src/stores/expenseStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { adaptTintColor } from '../../src/utils/tintColors';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MEMORY_CARD_WIDTH = 200;
const DATE_IDEA_CARD_WIDTH = 160;

// Soft tint palette for memory cards -- warm and varied
const memoryTints = [
  '#FDF5F0', // peach cream
  '#F0FAF4', // mint cream
  '#FCF0F5', // rose cream
  '#FFF9EB', // golden cream
  '#F5F0FA', // lavender cream
  '#EFF5FB', // sky cream
  '#FEF5ED', // apricot cream
];

// Memory type labels + accent colors for timeline
const memoryTypeAccent: Record<string, { label: string; color: string; bg: string; fallbackImage: string }> = {
  milestone: { label: 'Milestone', color: '#8B5CF6', bg: '#EDE9FE', fallbackImage: 'https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?w=200&q=80' },
  note:      { label: 'Memory',    color: '#10B981', bg: '#D1FAE5', fallbackImage: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=200&q=80' },
  photo:     { label: 'Photo',     color: '#3B82F6', bg: '#DBEAFE', fallbackImage: 'https://images.unsplash.com/photo-1490750967868-88df5691cc81?w=200&q=80' },
  document:  { label: 'Document',  color: '#F59E0B', bg: '#FEF3C7', fallbackImage: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200&q=80' },
};

// Accent strip colors for date idea cards by category
const dateIdeaCategoryAccent: Record<string, string> = {
  romantic: '#EC4899',
  adventure: '#10B981',
  creative: '#F59E0B',
  food: '#F08050',
  foodie: '#F08050',
  chill: '#8B5CF6',
};

// Insight type accent colors
const insightAccentColors: Record<string, string> = {
  achievement: '#10B981',
  tip: '#3B82F6',
  reminder: '#F59E0B',
};

// Insight type icons
const insightIcons: Record<string, string> = {
  trophy: 'trophy-outline',
  gift: 'gift-outline',
  lightbulb: 'bulb-outline',
  'trending-down': 'trending-down-outline',
  heart: 'heart-outline',
};

function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = parseISO(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function MemoryEntryRow({ memory, accent, isDark, styles }: {
  memory: any; accent: any; isDark: boolean; styles: any;
}) {
  const [imgError, setImgError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  // Determine which image URI to show
  const primaryUri = memory.imageUrl && !imgError ? memory.imageUrl : null;
  const fallbackUri = !primaryUri && !fallbackError ? accent.fallbackImage : null;
  const showUri = primaryUri ?? fallbackUri;

  return (
    <View style={styles.memEntryContent}>
      <View style={[styles.memEntryPlaceholder, { backgroundColor: accent.bg }]}>
        {showUri ? (
          <Image
            source={{ uri: showUri }}
            style={styles.memEntryImage}
            resizeMode="cover"
            onError={() => {
              if (primaryUri) setImgError(true);
              else setFallbackError(true);
            }}
          />
        ) : null}
      </View>
      <View style={styles.memEntryText}>
        <Text style={styles.memEntryTitle} numberOfLines={3}>{memory.title}</Text>
      </View>
    </View>
  );
}

export default function TogetherScreen() {
  const router = useRouter();
  const { mode } = useModeStore();
  const { tasks } = useTaskStore();
  const { events } = useCalendarStore();
  const { expenses, getBalance } = useExpenseStore();
  const user = useAuthStore((s) => s.user);
  const householdData = useHouseholdStore((s) => s.household);
  const members = useHouseholdStore((s) => s.members);
  const { memories, fetchMemories } = useMemoryStore();
  const { entries: timelineEntries, fetchTimeline } = useTimelineStore();
  const { polls, fetchPolls } = usePollStore();
  const cs = useSettingsStore((s) => s.currencySymbol) || '$';
  const { colors, shadows, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  useFocusEffect(useCallback(() => {
    fetchMemories();
    fetchTimeline();
    fetchPolls();
  }, []));

  const householdChildren = useMemo(() => householdData?.children ?? [], [householdData]);

  const handleInvite = () => {
    router.push('/invite' as any);
  };

  const currentUser = {
    id: user?.id ?? '',
    name: user?.name ?? 'You',
    email: user?.email ?? '',
    color: user ? getUserColor(user.id) : '#3B82F6',
  };

  const partner = useMemo(() => {
    const p = members.find((m) => m.id !== currentUser.id);
    return {
      id: p?.id ?? '',
      name: p?.name ?? 'Partner',
      color: p?.color ?? '#10B981',
    };
  }, [members, currentUser.id]);

  const household = {
    name: householdData?.name ?? 'Our Household',
    anniversary: householdData?.anniversary,
    togetherSince: householdData?.togetherSince,
    members,
  };

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const daysTogether = useMemo(() => {
    if (!household.togetherSince) return 0;
    return differenceInDays(new Date(), parseISO(household.togetherSince));
  }, [household.togetherSince]);
  const modeTheme = modeThemes[mode];
  const balance = getBalance();

  // --- This Week Stats ---
  const weekAgo = format(subDays(now, 7), 'yyyy-MM-dd');

  const weeklySharedEvents = useMemo(
    () => events.filter((e) => e.shared).length,
    [events],
  );

  const weeklyCompletedTasks = useMemo(
    () => tasks.filter((t) => t.shared && t.completed).length,
    [tasks],
  );

  const weeklySpending = useMemo(
    () =>
      expenses
        .filter((e) => e.date >= weekAgo)
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses, weekAgo],
  );

  // --- Single mode stats ---
  const weeklyEventsAttended = useMemo(
    () => events.filter((e) => e.createdBy === currentUser.id || e.shared).length,
    [events],
  );

  const weeklyTasksCompleted = useMemo(
    () => tasks.filter((t) => t.completed).length,
    [tasks],
  );

  const weeklyMoneySpent = useMemo(
    () =>
      expenses
        .filter((e) => e.date >= weekAgo)
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses, weekAgo],
  );

  // --- Partner's Day ---
  const partnerTodayEvents = useMemo(
    () =>
      events
        .filter(
          (e) =>
            e.startDate.startsWith(todayStr) &&
            (e.createdBy === partner.id || e.shared),
        )
        .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [events, todayStr],
  );

  const partnerPendingTasks = useMemo(
    () => tasks.filter((t) => !t.completed && t.assignedTo === partner.id),
    [tasks],
  );

  // --- Parenting: first child's events and tasks ---
  const olderChild = householdChildren.length > 0 ? householdChildren[0] : undefined;
  const baby = householdChildren.length > 1 ? householdChildren[1] : undefined;

  const olderChildTodayEvents = useMemo(
    () =>
      olderChild
        ? events
            .filter(
              (e) =>
                e.startDate.startsWith(todayStr) && e.createdBy === olderChild.id,
            )
            .sort((a, b) => a.startDate.localeCompare(b.startDate))
        : [],
    [events, todayStr, olderChild],
  );

  const olderChildTodayTasks = useMemo(
    () =>
      olderChild
        ? tasks.filter((t) => t.assignedTo === olderChild.id && t.dueDate === todayStr)
        : [],
    [tasks, todayStr, olderChild],
  );

  // --- Baby logs (will be populated when babyLogStore is wired) ---
  const latestBabyLogs = useMemo(() => {
    return {
      latestFeed: undefined as { timestamp: string; duration?: number; note?: string } | undefined,
      latestSleep: undefined as { timestamp: string; duration?: number; note?: string } | undefined,
      latestDiaper: undefined as { timestamp: string; note?: string } | undefined,
    };
  }, []);

  const milestones = useMemo(
    () => [] as { id: string; timestamp: string; note?: string }[],
    [],
  );

  // --- Family: active polls ---
  const activePolls = useMemo(
    () => polls.filter((p) => p.status === 'active'),
    [polls],
  );

  // --- Family: recent timeline ---
  const recentTimeline = useMemo(
    () =>
      [...timelineEntries]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3),
    [timelineEntries],
  );

  // --- Single mode: connections list ---
  const singleConnections = useMemo(() => {
    const connections: Array<{
      id: string;
      name: string;
      color: string;
      relationship: string;
    }> = [];
    // Add other household members as connections
    members
      .filter((m) => m.id !== currentUser.id)
      .forEach((m) => {
        connections.push({
          id: m.id,
          name: m.name,
          color: m.color || '#10B981',
          relationship: m.role ? m.role.charAt(0).toUpperCase() + m.role.slice(1) : 'Member',
        });
      });
    return connections;
  }, [members, currentUser.id]);

  // --- Kids quick status ---
  const getChildQuickStatus = (childId: string): string => {
    const childEvents = events.filter(
      (e) => e.startDate.startsWith(todayStr) && e.createdBy === childId,
    );
    if (childEvents.length > 0) {
      const nextEvent = childEvents.sort((a, b) =>
        a.startDate.localeCompare(b.startDate),
      )[0];
      const time = format(parseISO(nextEvent.startDate), 'h:mm a');
      return `${nextEvent.title} at ${time}`;
    }
    return 'Free today';
  };

  // ====================================================================
  // SINGLE MODE — "My Circle"
  // ====================================================================
  const renderSingleMode = () => {
    return (
      <>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Just Me</Text>
          <Text style={styles.headerSubtitle}>Your personal space</Text>
        </View>

        {/* My Stats This Week */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Week</Text>
        </View>
        <View style={styles.weekStatsFlexRow}>
          {[
            {
              value: weeklyEventsAttended,
              label: 'Events',
              icon: 'calendar-outline' as const,
              iconColor: colors.primary,
            },
            {
              value: weeklyTasksCompleted,
              label: 'Tasks done',
              icon: 'checkmark-circle-outline' as const,
              iconColor: colors.success,
            },
            {
              value: `${cs}${weeklyMoneySpent.toFixed(0)}`,
              label: 'Spent',
              icon: 'wallet-outline' as const,
              iconColor: colors.warning,
            },
          ].map((stat, idx) => (
            <View key={idx} style={styles.weekStatCardFlex}>
              <View
                style={[
                  styles.weekStatIconWrap,
                  { backgroundColor: stat.iconColor + '18' },
                ]}
              >
                <Ionicons name={stat.icon} size={18} color={stat.iconColor} />
              </View>
              <Text style={styles.weekStatValue}>{stat.value}</Text>
              <Text style={styles.weekStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Personal Insights */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Insights</Text>
          <TouchableOpacity onPress={() => router.push('/insights')} activeOpacity={0.6}>
            <Text style={styles.seeAllText}>View all</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.whiteCard}
          onPress={() => router.push('/insights')}
          activeOpacity={0.8}
        >
          {[
            {
              icon: 'checkmark-circle-outline' as const,
              label: 'Tasks completed',
              value: String(tasks.filter((t) => t.completed).length),
              color: '#10B981',
            },
            {
              icon: 'calendar-outline' as const,
              label: 'Upcoming events',
              value: String(events.filter((e) => new Date(e.startDate) > new Date()).length),
              color: '#6366F1',
            },
            {
              icon: 'card-outline' as const,
              label: 'Total logged',
              value: `${cs}${expenses.reduce((s, e) => s + e.amount, 0).toFixed(0)}`,
              color: '#F59E0B',
            },
          ].map((stat, idx, arr) => (
            <View
              key={stat.label}
              style={[
                styles.insightStatRow,
                idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
              ]}
            >
              <View style={[styles.insightStatIcon, { backgroundColor: stat.color + '18' }]}>
                <Ionicons name={stat.icon} size={16} color={stat.color} />
              </View>
              <Text style={styles.insightStatLabel}>{stat.label}</Text>
              <Text style={[styles.insightStatValue, { color: stat.color }]}>{stat.value}</Text>
            </View>
          ))}
          <View style={styles.insightViewMore}>
            <Ionicons name="bulb-outline" size={13} color={colors.primary} />
            <Text style={[styles.insightViewMoreText, { color: colors.primary }]}>View personalized insights</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
        </View>
        <View style={styles.quickActionsRow}>
          {[
            {
              label: 'Add memory',
              icon: 'star-outline' as const,
              onPress: () => router.push('/add-memory'),
            },
            {
              label: 'Journal',
              icon: 'book-outline' as const,
              onPress: () => router.push('/journal'),
            },
            {
              label: 'Set goal',
              icon: 'flag-outline' as const,
              onPress: () => router.push('/goals'),
            },
            {
              label: 'Wellness',
              icon: 'heart-circle-outline' as const,
              onPress: () => router.push('/add-wellness' as any),
            },
          ].map((action, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.quickActionWrap}
              activeOpacity={0.7}
              onPress={action.onPress}
            >
              <View
                style={[
                  styles.quickActionCircle,
                  { backgroundColor: modeTheme.accent },
                ]}
              >
                <Ionicons name={action.icon} size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 160 }} />
      </>
    );
  };

  // ====================================================================
  // COUPLE MODE — "Partner"
  // ====================================================================
  const renderCoupleMode = () => {
    const anniversaryDate = household.anniversary
      ? format(parseISO(household.anniversary), 'MMMM d, yyyy')
      : '';

    return (
      <>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Partner</Text>
          <Text style={styles.headerSubtitle}>You & {partner.name}</Text>
        </View>

        {/* Connection Card */}
        <View style={styles.whiteCard}>
          <View style={styles.coupleAvatarRow}>
            <View style={styles.coupleAvatarWrap}>
              <Avatar
                name={currentUser.name}
                size={64}
                color={getUserColor(currentUser.id)}
              />
            </View>
            <View style={styles.coupleHeartBadge}>
              <Ionicons name="heart" size={14} color="#FFFFFF" />
            </View>
            <View
              style={[styles.coupleAvatarWrap, { marginLeft: -spacing.lg }]}
            >
              <Avatar
                name={partner.id ? partner.name : '?'}
                size={64}
                color={partner.id ? getUserColor(partner.id) : colors.textTertiary}
              />
            </View>
          </View>
          <Text style={styles.coupleDaysNumber}>
            {daysTogether.toLocaleString()}
          </Text>
          <Text style={styles.coupleDaysLabel}>days together</Text>
          {anniversaryDate !== '' && (
            <Text style={styles.coupleAnniversary}>
              Together since {anniversaryDate}
            </Text>
          )}
          {partner.id === '' && (
            <TouchableOpacity
              style={styles.inviteRow}
              onPress={handleInvite}
              activeOpacity={0.7}
            >
              <View style={styles.inviteIconCircle}>
                <Ionicons name="heart-half-outline" size={16} color={colors.primary} />
              </View>
              <Text style={styles.inviteRowText}>Invite your partner</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* This Week Together Stats */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>This Week Together</Text>
        </View>
        <View style={styles.weekStatsFlexRow}>
          {[
            {
              value: weeklySharedEvents,
              label: 'Events',
              icon: 'calendar-outline' as const,
              iconColor: colors.primary,
            },
            {
              value: weeklyCompletedTasks,
              label: 'Tasks done',
              icon: 'checkmark-circle-outline' as const,
              iconColor: colors.success,
            },
            {
              value: `${cs}${weeklySpending.toFixed(0)}`,
              label: 'Spending',
              icon: 'wallet-outline' as const,
              iconColor: colors.warning,
            },
          ].map((stat, idx) => (
            <View key={idx} style={styles.weekStatCardFlex}>
              <View
                style={[
                  styles.weekStatIconWrap,
                  { backgroundColor: stat.iconColor + '18' },
                ]}
              >
                <Ionicons name={stat.icon} size={18} color={stat.iconColor} />
              </View>
              <Text style={styles.weekStatValue}>{stat.value}</Text>
              <Text style={styles.weekStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Partner's Day */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{partner.name}'s Day</Text>
        </View>
        <View style={styles.whiteCard}>
          <View style={styles.partnerCardHeader}>
            <Avatar
              name={partner.id ? partner.name : '?'}
              size={28}
              color={partner.id ? getUserColor(partner.id) : colors.textTertiary}
            />
            <Text style={styles.partnerCardName}>{partner.id ? partner.name : 'Partner'}</Text>
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>today</Text>
            </View>
          </View>

          {partnerTodayEvents.length > 0 ? (
            <View style={styles.miniTimeline}>
              {partnerTodayEvents.map((event, idx) => (
                <View key={event.id} style={styles.miniTimelineRow}>
                  <View style={styles.miniTimelineDotCol}>
                    <View
                      style={[
                        styles.miniDot,
                        {
                          backgroundColor:
                            event.color || getUserColor(partner.id),
                        },
                      ]}
                    />
                    {idx < partnerTodayEvents.length - 1 && (
                      <View style={styles.miniLine} />
                    )}
                  </View>
                  <View style={styles.miniTimelineContent}>
                    <Text style={styles.miniEventTitle}>{event.title}</Text>
                    <Text style={styles.miniEventTime}>
                      {event.allDay
                        ? 'All day'
                        : format(parseISO(event.startDate), 'h:mm a')}
                      {event.location ? ` \u00B7 ${event.location}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
              <Text style={styles.partnerEmpty}>No events today</Text>
              <Text style={[styles.partnerEmpty, { fontSize: 12, marginTop: 2 }]}>Add events to see their schedule here</Text>
              <TouchableOpacity onPress={() => router.push('/add-event')} activeOpacity={0.7} style={{ marginTop: spacing.sm }}>
                <Text style={[styles.seeAllText, { fontSize: 13 }]}>+ Add event</Text>
              </TouchableOpacity>
            </View>
          )}

          {partnerPendingTasks.length > 0 && (
            <View style={styles.partnerTasks}>
              <Text style={styles.partnerTasksLabel}>
                {partnerPendingTasks.length} pending task
                {partnerPendingTasks.length !== 1 ? 's' : ''}
              </Text>
              {partnerPendingTasks.slice(0, 3).map((task) => (
                <View key={task.id} style={styles.partnerTaskRow}>
                  <View style={styles.partnerTaskCheck} />
                  <Text style={styles.partnerTaskTitle} numberOfLines={1}>
                    {task.title}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Memory Lane */}
        <View style={styles.memLaneHeader}>
          <Text style={styles.sectionTitle}>Memory Lane</Text>
          <TouchableOpacity
            onPress={() => router.push('/add-memory')}
            style={styles.memLaneAddBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {memories.length === 0 ? (
          <View style={styles.whiteCard}>
            <View style={styles.emptyHintContainer}>
              <View style={[styles.emptyHintIcon, { backgroundColor: adaptTintColor('#FEF3C7', isDark) }]}>
                <Ionicons name="star-outline" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.emptyHintTitle}>Save your favorite moments</Text>
              <Text style={styles.emptyHintDesc}>
                Add memories of special times you share — dates, milestones, or everyday joy
              </Text>
              <TouchableOpacity
                style={[styles.emptyHintBtn, { backgroundColor: '#F59E0B' }]}
                activeOpacity={0.7}
                onPress={() => router.push('/add-memory')}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />
                <Text style={styles.emptyHintBtnText}>Add memory</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.memTimelineWrap}>
            {[...memories]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((memory, idx, arr) => {
                const d = new Date(memory.date);
                const day = format(d, 'd');
                const month = format(d, 'MMM').toUpperCase();
                const accent = memoryTypeAccent[memory.type] ?? memoryTypeAccent.note;
                const isLast = idx === arr.length - 1;
                return (
                  <View key={memory.id} style={styles.memTimelineRow}>
                    {/* Date */}
                    <View style={styles.memDateCol}>
                      <Text style={styles.memDayNum}>{day}</Text>
                      <Text style={styles.memMonthText}>{month}</Text>
                    </View>
                    {/* Dot + connector line */}
                    <View style={styles.memLineCol}>
                      <View style={[styles.memDot, { backgroundColor: accent.color }]} />
                      {!isLast && <View style={styles.memConnector} />}
                    </View>
                    {/* Image + text */}
                    <MemoryEntryRow memory={memory} accent={accent} isDark={isDark} styles={styles} />
                  </View>
                );
              })}
            {memories.length > 5 && (
              <TouchableOpacity
                style={styles.memSeeAllRow}
                onPress={() => router.push('/timeline')}
                activeOpacity={0.7}
              >
                <Text style={[styles.seeAllText, { fontWeight: '600' }]}>
                  See all {memories.length} memories
                </Text>
                <Ionicons name="chevron-forward" size={13} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Date Ideas */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Date Ideas</Text>
        </View>
        <View style={styles.whiteCard}>
          <View style={styles.emptyHintContainer}>
            <View style={[styles.emptyHintIcon, { backgroundColor: adaptTintColor('#FCE7F3', isDark) }]}>
              <Ionicons name="heart-outline" size={24} color="#EC4899" />
            </View>
            <Text style={styles.emptyHintTitle}>Plan your next date</Text>
            <Text style={styles.emptyHintDesc}>
              Build a collection of fun things to do together — dinners, adventures, or cozy nights in
            </Text>
            <TouchableOpacity
              style={[styles.emptyHintBtn, { backgroundColor: '#EC4899' }]}
              activeOpacity={0.7}
              onPress={() => router.push('/date-ideas')}
            >
              <Ionicons name="sparkles" size={14} color="#FFFFFF" />
              <Text style={styles.emptyHintBtnText}>Browse ideas</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
        </View>
        <View style={styles.quickActionsRow}>
          {[
            {
              label: 'Plan a date',
              icon: 'heart-outline' as const,
              onPress: () => router.push('/date-ideas'),
            },
            {
              label: 'Settle up',
              icon: 'swap-horizontal-outline' as const,
              onPress: () => router.push('/settle-up'),
            },
            {
              label: 'Add memory',
              icon: 'star-outline' as const,
              onPress: () => router.push('/add-memory'),
            },
            {
              label: 'Polls',
              icon: 'chatbubbles-outline' as const,
              onPress: () => router.push('/polls'),
            },
          ].map((action, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.quickActionWrap}
              activeOpacity={0.7}
              onPress={action.onPress}
            >
              <View
                style={[
                  styles.quickActionCircle,
                  { backgroundColor: modeTheme.accent },
                ]}
              >
                <Ionicons name={action.icon} size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 160 }} />
      </>
    );
  };

  // ====================================================================
  // FAMILY MODE — "Family"
  // ====================================================================
  const renderFamilyMode = () => {
    const allFamilyAvatars = [
      {
        id: currentUser.id,
        name: currentUser.name,
        color: getUserColor(currentUser.id),
      },
      {
        id: partner.id,
        name: partner.name,
        color: getUserColor(partner.id),
      },
      ...householdChildren.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
      })),
    ];

    const totalMembers = allFamilyAvatars.length;

    return (
      <>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Family</Text>
          <Text style={styles.headerSubtitle}>
            The {household.name} crew
          </Text>
        </View>

        {/* Family Circle Card */}
        <View style={styles.whiteCard}>
          <Text style={styles.cardTitle}>Family Circle</Text>
          {allFamilyAvatars.length <= 1 ? (
            <View style={styles.emptyHintContainer}>
              <View style={[styles.emptyHintIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="people-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.emptyHintTitle}>Gather your crew</Text>
              <Text style={styles.emptyHintDesc}>
                Invite your family to share calendars, split tasks, and keep everyone on the same page
              </Text>
              <TouchableOpacity
                style={[styles.emptyHintBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.7}
                onPress={handleInvite}
              >
                <Ionicons name="person-add" size={14} color="#FFFFFF" />
                <Text style={styles.emptyHintBtnText}>Invite family</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.familyGrid}>
                {allFamilyAvatars.map((member) => (
                  <View key={member.id} style={styles.familyGridItem}>
                    <Avatar name={member.name} size={48} color={member.color} />
                    <Text style={styles.familyGridName} numberOfLines={1}>
                      {member.name}
                    </Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={styles.inviteRow}
                onPress={handleInvite}
                activeOpacity={0.7}
              >
                <View style={styles.inviteIconCircle}>
                  <Ionicons name="person-add" size={16} color={colors.primary} />
                </View>
                <Text style={styles.inviteRowText}>Invite members</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
              <Text style={styles.connectionSubtext}>
                {totalMembers} members
              </Text>
            </>
          )}
        </View>

        {/* Family This Week */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Family This Week</Text>
        </View>
        <View style={styles.weekStatsFlexRow}>
          {[
            {
              value: weeklySharedEvents,
              label: 'Events',
              icon: 'calendar-outline' as const,
              iconColor: colors.primary,
            },
            {
              value: weeklyCompletedTasks,
              label: 'Tasks done',
              icon: 'checkmark-circle-outline' as const,
              iconColor: colors.success,
            },
            {
              value: `${cs}${weeklySpending.toFixed(0)}`,
              label: 'Spending',
              icon: 'wallet-outline' as const,
              iconColor: colors.warning,
            },
          ].map((stat, idx) => (
            <View key={idx} style={styles.weekStatCardFlex}>
              <View
                style={[
                  styles.weekStatIconWrap,
                  { backgroundColor: stat.iconColor + '18' },
                ]}
              >
                <Ionicons name={stat.icon} size={18} color={stat.iconColor} />
              </View>
              <Text style={styles.weekStatValue}>{stat.value}</Text>
              <Text style={styles.weekStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Family Activity Feed */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Activity Feed</Text>
        </View>
        <View style={styles.whiteCard}>
          <View style={styles.emptyHintContainer}>
            <View style={[styles.emptyHintIcon, { backgroundColor: colors.successLight }]}>
              <Ionicons name="people-outline" size={24} color={colors.success} />
            </View>
            <Text style={styles.emptyHintTitle}>Family activity will appear here</Text>
            <Text style={styles.emptyHintDesc}>
              When family members complete tasks, add events, or update lists — it shows up here
            </Text>
          </View>
        </View>

        {/* Family Timeline Preview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {recentTimeline.length > 4 && (
            <TouchableOpacity
              onPress={() => router.push('/timeline')}
              activeOpacity={0.6}
            >
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.whiteCard}>
          {recentTimeline.length === 0 ? (
            <View style={styles.emptyHintContainer}>
              <View style={[styles.emptyHintIcon, { backgroundColor: adaptTintColor('#EDE9FE', isDark) }]}>
                <Ionicons name="time-outline" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.emptyHintTitle}>Your family timeline</Text>
              <Text style={styles.emptyHintDesc}>
                Record milestones, events, and special moments your family shares
              </Text>
              <TouchableOpacity
                style={[styles.emptyHintBtn, { backgroundColor: '#8B5CF6' }]}
                activeOpacity={0.7}
                onPress={() => router.push('/add-timeline-entry')}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />
                <Text style={styles.emptyHintBtnText}>Add entry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentTimeline.map((entry, idx) => (
              <View
                key={entry.id}
                style={[
                  styles.timelineRow,
                  idx < recentTimeline.length - 1 && styles.activityRowBorder,
                ]}
              >
                <Text style={styles.timelineEmoji}>{entry.emoji}</Text>
                <View style={styles.timelineTextWrap}>
                  <Text style={styles.timelineTitle}>{entry.title}</Text>
                  <Text style={styles.timelineDate}>
                    {format(parseISO(entry.date), 'MMM d, yyyy')}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Family Polls */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Family Polls</Text>
        </View>
        {activePolls.length === 0 ? (
          <View style={[styles.whiteCard, { marginHorizontal: spacing.xl }]}>
            <View style={styles.emptyHintContainer}>
              <View style={[styles.emptyHintIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="chatbubbles-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.emptyHintTitle}>Vote together on decisions</Text>
              <Text style={styles.emptyHintDesc}>
                Create polls to decide things as a family — dinner, activities, or weekend plans
              </Text>
              <TouchableOpacity
                style={[styles.emptyHintBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.7}
                onPress={() => router.push('/create-poll')}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />
                <Text style={styles.emptyHintBtnText}>Create poll</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.pollsContainer}>
            {activePolls.map((poll) => {
              const totalVotes = poll.options.reduce(
                (sum, opt) => sum + opt.votes.length,
                0,
              );
              const userVoted = poll.options.some((opt) =>
                opt.votes.includes(currentUser.id),
              );
              return (
                <TouchableOpacity
                  key={poll.id}
                  style={styles.pollCard}
                  activeOpacity={0.7}
                  onPress={() => router.push('/polls')}
                >
                  <Text style={styles.pollQuestion}>{poll.question}</Text>
                  <View style={styles.pollMeta}>
                    <Text style={styles.pollOptionCount}>
                      {poll.options.length} options
                    </Text>
                    <View
                      style={[
                        styles.pollVoteBadge,
                        {
                          backgroundColor: userVoted
                            ? colors.successLight
                            : colors.warningLight,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pollVoteBadgeText,
                          {
                            color: userVoted ? colors.success : colors.warning,
                          },
                        ]}
                      >
                        {userVoted ? 'Voted' : 'Vote now'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
        </View>
        <View style={styles.quickActionsRow}>
          {[
            {
              label: 'Family plan',
              icon: 'people-outline' as const,
              onPress: () => router.push('/(tabs)/calendar'),
            },
            {
              label: 'Settle up',
              icon: 'swap-horizontal-outline' as const,
              onPress: () => router.push('/settle-up'),
            },
            {
              label: 'Add memory',
              icon: 'star-outline' as const,
              onPress: () => router.push('/add-memory'),
            },
            {
              label: 'Polls',
              icon: 'chatbubbles-outline' as const,
              onPress: () => router.push('/polls'),
            },
          ].map((action, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.quickActionWrap}
              activeOpacity={0.7}
              onPress={action.onPress}
            >
              <View
                style={[
                  styles.quickActionCircle,
                  { backgroundColor: modeTheme.accent },
                ]}
              >
                <Ionicons name={action.icon} size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 160 }} />
      </>
    );
  };

  // ====================================================================
  // PARENTING MODE — "Kids"
  // ====================================================================
  const renderParentingMode = () => {
    const { latestFeed, latestSleep, latestDiaper } = latestBabyLogs;

    return (
      <>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Kids</Text>
          <Text style={styles.headerSubtitle}>
            {householdChildren.map((c) => c.name).join(' & ') || 'Your kids'}
          </Text>
        </View>

        {/* Kids Overview Card */}
        <View style={styles.whiteCard}>
          <Text style={styles.cardTitle}>Kids Overview</Text>
          {householdChildren.map((child) => {
            const age = differenceInYears(new Date(), parseISO(child.dateOfBirth));
            const status = getChildQuickStatus(child.id);
            return (
              <View key={child.id} style={styles.kidOverviewRow}>
                <Avatar name={child.name} size={44} color={child.color} />
                <View style={styles.kidOverviewInfo}>
                  <View style={styles.kidOverviewNameRow}>
                    <Text style={styles.kidOverviewName}>{child.name}</Text>
                    <Text style={styles.kidOverviewAge}>
                      {age} {age === 1 ? 'year' : 'years'} old
                    </Text>
                  </View>
                  <Text style={styles.kidOverviewStatus} numberOfLines={1}>
                    {status}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Baby Dashboard (Liam) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Baby Dashboard{baby ? ` — ${baby.name}` : ''}</Text>
        </View>
        <View style={styles.whiteCard}>
          {/* Feed */}
          <View style={styles.babyLogRow}>
            <Text style={styles.babyLogEmoji}>{'\uD83C\uDF7C'}</Text>
            <View style={styles.babyLogInfo}>
              <Text style={styles.babyLogType}>Last Feed</Text>
              {latestFeed ? (
                <>
                  <Text style={styles.babyLogTime}>
                    {format(parseISO(latestFeed.timestamp), 'h:mm a')}
                    {latestFeed.duration
                      ? ` \u00B7 ${latestFeed.duration} min`
                      : ''}
                  </Text>
                  {latestFeed.note && (
                    <Text style={styles.babyLogNote}>{latestFeed.note}</Text>
                  )}
                </>
              ) : (
                <TouchableOpacity onPress={() => router.push('/log-baby')} activeOpacity={0.7}>
                  <Text style={[styles.babyLogNote, { color: modeTheme.accent }]}>Tap to log feeding time</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.babyLogDivider} />

          {/* Sleep */}
          <View style={styles.babyLogRow}>
            <Text style={styles.babyLogEmoji}>{'\uD83D\uDCA4'}</Text>
            <View style={styles.babyLogInfo}>
              <Text style={styles.babyLogType}>Last Sleep</Text>
              {latestSleep ? (
                <>
                  <Text style={styles.babyLogTime}>
                    {format(parseISO(latestSleep.timestamp), 'h:mm a')}
                    {latestSleep.duration
                      ? ` \u00B7 ${latestSleep.duration} min`
                      : ''}
                  </Text>
                  {latestSleep.note && (
                    <Text style={styles.babyLogNote}>{latestSleep.note}</Text>
                  )}
                </>
              ) : (
                <TouchableOpacity onPress={() => router.push('/log-baby')} activeOpacity={0.7}>
                  <Text style={[styles.babyLogNote, { color: modeTheme.accent }]}>Tap to log sleep</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.babyLogDivider} />

          {/* Diaper */}
          <View style={styles.babyLogRow}>
            <Text style={styles.babyLogEmoji}>{'\uD83E\uDDF7'}</Text>
            <View style={styles.babyLogInfo}>
              <Text style={styles.babyLogType}>Last Diaper</Text>
              {latestDiaper ? (
                <>
                  <Text style={styles.babyLogTime}>
                    {format(parseISO(latestDiaper.timestamp), 'h:mm a')}
                  </Text>
                  {latestDiaper.note && (
                    <Text style={styles.babyLogNote}>{latestDiaper.note}</Text>
                  )}
                </>
              ) : (
                <TouchableOpacity onPress={() => router.push('/log-baby')} activeOpacity={0.7}>
                  <Text style={[styles.babyLogNote, { color: modeTheme.accent }]}>Tap to log diaper change</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Emma's Activities */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{olderChild?.name ?? 'Child'}'s Activities</Text>
        </View>
        <View style={styles.whiteCard}>
          {olderChildTodayEvents.length > 0 || olderChildTodayTasks.length > 0 ? (
            <>
              {olderChildTodayEvents.map((event) => (
                <View key={event.id} style={styles.emmaActivityRow}>
                  <View
                    style={[
                      styles.emmaActivityDot,
                      { backgroundColor: event.color || modeTheme.accent },
                    ]}
                  />
                  <View style={styles.emmaActivityInfo}>
                    <Text style={styles.emmaActivityTitle}>{event.title}</Text>
                    <Text style={styles.emmaActivityTime}>
                      {event.allDay
                        ? 'All day'
                        : format(parseISO(event.startDate), 'h:mm a')}
                      {event.location ? ` \u00B7 ${event.location}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
              {olderChildTodayTasks.map((task) => (
                <View key={task.id} style={styles.emmaActivityRow}>
                  <View
                    style={[
                      styles.emmaTaskCheck,
                      task.completed && {
                        backgroundColor: colors.success,
                        borderColor: colors.success,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.emmaActivityTitle,
                      task.completed && styles.emmaActivityCompleted,
                    ]}
                    numberOfLines={1}
                  >
                    {task.title}
                  </Text>
                </View>
              ))}
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
              <Text style={styles.partnerEmpty}>
                No activities for {olderChild?.name ?? 'child'} today
              </Text>
              <Text style={[styles.partnerEmpty, { fontSize: 12, marginTop: 2 }]}>Add school, sports, or play events</Text>
              <TouchableOpacity onPress={() => router.push('/add-event')} activeOpacity={0.7} style={{ marginTop: spacing.sm }}>
                <Text style={[styles.seeAllText, { fontSize: 13 }]}>+ Add activity</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Growth Milestones */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Growth Milestones</Text>
        </View>
        <View style={styles.whiteCard}>
          {milestones.length > 0 ? (
            milestones.map((milestone, idx) => (
              <View
                key={milestone.id}
                style={[
                  styles.milestoneRow,
                  idx < milestones.length - 1 && styles.activityRowBorder,
                ]}
              >
                <View style={styles.milestoneIconWrap}>
                  <Ionicons
                    name="star"
                    size={16}
                    color={modeTheme.accent}
                  />
                </View>
                <View style={styles.milestoneInfo}>
                  <Text style={styles.milestoneDate}>
                    {format(parseISO(milestone.timestamp), 'MMM d, yyyy')}
                  </Text>
                  {milestone.note && (
                    <Text style={styles.milestoneNote}>
                      {milestone.note}
                    </Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyHintContainer}>
              <View style={[styles.emptyHintIcon, { backgroundColor: adaptTintColor('#FEF3C7', isDark) }]}>
                <Ionicons name="star-outline" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.emptyHintTitle}>Track growth milestones</Text>
              <Text style={styles.emptyHintDesc}>
                Record first steps, first words, and other special moments
              </Text>
              <TouchableOpacity
                style={[styles.emptyHintBtn, { backgroundColor: '#F59E0B' }]}
                activeOpacity={0.7}
                onPress={() => router.push('/add-timeline-entry')}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />
                <Text style={styles.emptyHintBtnText}>Add milestone</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
        </View>
        <View style={styles.quickActionsRow}>
          {[
            {
              label: 'Log feed',
              icon: 'restaurant-outline' as const,
              onPress: () => router.push('/log-baby'),
            },
            {
              label: 'Log sleep',
              icon: 'moon-outline' as const,
              onPress: () => router.push('/log-baby'),
            },
            {
              label: 'Add milestone',
              icon: 'star-outline' as const,
              onPress: () => router.push('/add-timeline-entry'),
            },
            {
              label: 'Polls',
              icon: 'chatbubbles-outline' as const,
              onPress: () => router.push('/polls'),
            },
          ].map((action, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.quickActionWrap}
              activeOpacity={0.7}
              onPress={action.onPress}
            >
              <View
                style={[
                  styles.quickActionCircle,
                  { backgroundColor: modeTheme.accent },
                ]}
              >
                <Ionicons name={action.icon} size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 160 }} />
      </>
    );
  };

  // ====================================================================
  // RENDER — calls the right mode function
  // ====================================================================
  const renderModeContent = () => {
    switch (mode) {
      case 'personal':
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
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderModeContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

// ======================================================================
// STYLES
// ======================================================================
const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing['3xl'],
  },

  // ----------------------------------------------------------------
  // HEADER
  // ----------------------------------------------------------------
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerTitle: {
    ...typography.largeTitle,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.callout,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // ----------------------------------------------------------------
  // GENERIC WHITE CARD
  // ----------------------------------------------------------------
  whiteCard: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  cardTitle: {
    ...typography.title2,
    color: colors.text,
    marginBottom: spacing.lg,
  },

  // ----------------------------------------------------------------
  // SECTION HEADERS
  // ----------------------------------------------------------------
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18, fontWeight: '700',
    color: colors.text,
  },
  seeAllText: {
    ...typography.caption1,
    color: colors.primary,
  },

  // ----------------------------------------------------------------
  // SINGLE MODE: Connections
  // ----------------------------------------------------------------
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  connectionName: {
    ...typography.headline,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.md,
  },
  relationshipBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  relationshipBadgeText: {
    ...typography.caption1,
    fontWeight: '600',
  },
  connectionSubtext: {
    ...typography.callout,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  // ----------------------------------------------------------------
  // SINGLE MODE: Insights
  // ----------------------------------------------------------------
  insightsContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  insightCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  insightAccentBar: {
    width: 4,
  },
  insightContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  insightIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTextWrap: {
    flex: 1,
  },
  insightTitle: {
    ...typography.subhead,
    color: colors.text,
    marginBottom: 2,
  },
  insightDescription: {
    ...typography.caption1,
    color: colors.textSecondary,
  },

  // ----------------------------------------------------------------
  // WEEK STATS
  // ----------------------------------------------------------------
  weekStatsScroll: {
    marginBottom: spacing.xl,
  },
  weekStatsRow: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  weekStatsFlexRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  weekStatCard: {
    width: (SCREEN_WIDTH - spacing.xl * 2 - spacing.md * 2) / 3,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  weekStatCardFlex: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  weekStatIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  weekStatValue: {
    ...typography.title3,
    color: colors.text,
    marginBottom: 2,
  },
  weekStatLabel: {
    ...typography.caption1,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // ----------------------------------------------------------------
  // COUPLE MODE: Connection Card
  // ----------------------------------------------------------------
  coupleAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  coupleAvatarWrap: {
    borderWidth: 3,
    borderColor: colors.surface,
    borderRadius: 999,
  },
  coupleHeartBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EC4899',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -spacing.md,
    zIndex: 2,
    ...shadows.sm,
  },
  coupleDaysNumber: {
    ...heroTypography.heroNumber,
    color: colors.text,
    textAlign: 'center',
  },
  coupleDaysLabel: {
    ...heroTypography.heroLabel,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  coupleAnniversary: {
    ...typography.footnote,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  // ----------------------------------------------------------------
  // PARTNER'S DAY
  // ----------------------------------------------------------------
  partnerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  partnerCardName: {
    ...typography.headline,
    color: colors.text,
    flex: 1,
  },
  todayBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  todayBadgeText: {
    ...typography.caption2,
    color: colors.primary,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  miniTimeline: {
    marginLeft: spacing.xs,
  },
  miniTimelineRow: {
    flexDirection: 'row',
    minHeight: 36,
  },
  miniTimelineDotCol: {
    width: 16,
    alignItems: 'center',
    paddingTop: 5,
  },
  miniDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  miniLine: {
    width: 1,
    flex: 1,
    backgroundColor: colors.borderLight,
    marginTop: 3,
    marginBottom: 3,
  },
  miniTimelineContent: {
    flex: 1,
    marginLeft: spacing.sm,
    paddingBottom: spacing.sm,
  },
  miniEventTitle: {
    ...typography.subhead,
    color: colors.text,
  },
  miniEventTime: {
    ...typography.caption2,
    color: colors.textTertiary,
    marginTop: 1,
  },
  partnerEmpty: {
    ...typography.footnote,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  partnerTasks: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  partnerTasksLabel: {
    ...typography.caption1,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  partnerTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  partnerTaskCheck: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  partnerTaskTitle: {
    ...typography.footnote,
    color: colors.textSecondary,
    flex: 1,
  },

  // ----------------------------------------------------------------
  // MEMORY LANE — Vertical Timeline
  // ----------------------------------------------------------------
  memLaneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  memLaneAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memTimelineWrap: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  memTimelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 96,
  },
  memDateCol: {
    width: 44,
    alignItems: 'flex-end',
    paddingRight: 8,
    paddingTop: 4,
  },
  memDayNum: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.textSecondary,
    lineHeight: 30,
  },
  memMonthText: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  memLineCol: {
    width: 16,
    alignItems: 'center',
    paddingTop: 8,
  },
  memDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  memConnector: {
    width: 1.5,
    flex: 1,
    backgroundColor: colors.borderLight,
    marginTop: 4,
  },
  memEntryContent: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.xl,
    paddingLeft: spacing.sm,
  },
  memEntryImage: {
    width: 80,
    height: 80,
  },
  memEntryPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
  },
  memEntryOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  memEntryEmojiOverlay: {
    fontSize: 24,
    zIndex: 2,
  },
  memEntryEmoji: {
    fontSize: 28,
  },
  memEntryText: {
    flex: 1,
    paddingTop: 2,
  },
  memEntryType: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  memEntryTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 25,
  },
  memSeeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingLeft: 60 + spacing.sm,
  },

  // ----------------------------------------------------------------
  // DATE IDEAS
  // ----------------------------------------------------------------
  dateIdeasScroll: {
    marginBottom: spacing.xl,
  },
  dateIdeasRow: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  dateIdeaCard: {
    width: DATE_IDEA_CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    minHeight: 140,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  dateIdeaAccentStrip: {
    height: 0,
    width: '100%',
  },
  dateIdeaContent: {
    padding: spacing.lg,
    flex: 1,
    justifyContent: 'flex-end',
  },
  dateIdeaTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  dateIdeaCostPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  dateIdeaCostText: {
    ...typography.caption2,
    color: colors.primary,
    fontWeight: '600',
  },
  dateIdeaCategory: {
    ...typography.caption1,
    color: colors.textTertiary,
    textTransform: 'capitalize',
  },

  // ----------------------------------------------------------------
  // QUICK ACTIONS
  // ----------------------------------------------------------------
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-around',
  },
  quickActionWrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickActionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  quickActionLabel: {
    ...typography.caption1,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 72,
  },

  // ----------------------------------------------------------------
  // FAMILY MODE: Grid
  // ----------------------------------------------------------------
  familyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  familyGridItem: {
    alignItems: 'center',
    width: 64,
  },
  familyGridName: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.md,
  },
  inviteIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteRowText: {
    ...typography.subhead,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },

  // ----------------------------------------------------------------
  // FAMILY MODE: Activity Feed
  // ----------------------------------------------------------------
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  activityRowBorder: {
  },
  activityTextWrap: {
    flex: 1,
  },
  activityDetail: {
    ...typography.subhead,
    color: colors.text,
  },
  activityTime: {
    ...typography.caption1,
    color: colors.textTertiary,
    marginTop: 2,
  },

  // ----------------------------------------------------------------
  // FAMILY MODE: Timeline
  // ----------------------------------------------------------------
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  timelineEmoji: {
    fontSize: 24,
  },
  timelineTextWrap: {
    flex: 1,
  },
  timelineTitle: {
    ...typography.subhead,
    color: colors.text,
  },
  timelineDate: {
    ...typography.caption1,
    color: colors.textTertiary,
    marginTop: 2,
  },

  // ----------------------------------------------------------------
  // FAMILY MODE: Polls
  // ----------------------------------------------------------------
  pollsContainer: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  pollCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  pollQuestion: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  pollMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pollOptionCount: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  pollVoteBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  pollVoteBadgeText: {
    ...typography.caption1,
    fontWeight: '600',
  },

  // ----------------------------------------------------------------
  // PARENTING MODE: Kids Overview
  // ----------------------------------------------------------------
  kidOverviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  kidOverviewInfo: {
    flex: 1,
  },
  kidOverviewNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  kidOverviewName: {
    ...typography.headline,
    color: colors.text,
  },
  kidOverviewAge: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  kidOverviewStatus: {
    ...typography.callout,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ----------------------------------------------------------------
  // PARENTING MODE: Baby Dashboard
  // ----------------------------------------------------------------
  babyLogRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  babyLogEmoji: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  babyLogInfo: {
    flex: 1,
  },
  babyLogType: {
    ...typography.subhead,
    color: colors.text,
    marginBottom: 2,
  },
  babyLogTime: {
    ...typography.callout,
    color: colors.textSecondary,
  },
  babyLogNote: {
    ...typography.caption1,
    color: colors.textTertiary,
    marginTop: 2,
  },
  babyLogDivider: {
    height: 0,
  },

  // ----------------------------------------------------------------
  // PARENTING MODE: Emma's Activities
  // ----------------------------------------------------------------
  emmaActivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  emmaActivityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emmaActivityInfo: {
    flex: 1,
  },
  emmaActivityTitle: {
    ...typography.subhead,
    color: colors.text,
  },
  emmaActivityTime: {
    ...typography.caption1,
    color: colors.textTertiary,
    marginTop: 1,
  },
  emmaTaskCheck: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  emmaActivityCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },

  // ----------------------------------------------------------------
  // PARENTING MODE: Milestones
  // ----------------------------------------------------------------
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  milestoneIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneDate: {
    ...typography.caption1,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  milestoneNote: {
    ...typography.subhead,
    color: colors.text,
  },

  // ----------------------------------------------------------------
  // EMPTY HINT (reusable descriptive empty state)
  // ----------------------------------------------------------------
  emptyHintContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  emptyHintIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyHintTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyHintDesc: {
    ...typography.callout,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  emptyHintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  emptyHintBtnText: {
    ...typography.subhead,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // ----------------------------------------------------------------
  // INSIGHT STATS (Personal Insights section in single mode)
  // ----------------------------------------------------------------
  insightStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  insightStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightStatLabel: {
    ...typography.subhead,
    color: colors.textSecondary,
    flex: 1,
  },
  insightStatValue: {
    ...typography.headline,
    fontWeight: '700',
  },
  insightViewMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.xs,
  },
  insightViewMoreText: {
    ...typography.caption1,
    fontWeight: '600',
  },
});
