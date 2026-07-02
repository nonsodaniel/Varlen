import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  format,
  parseISO,
  subDays,
  differenceInYears,
  differenceInDays,
} from 'date-fns';
import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  heroTypography,
  modeThemes,
} from '../../src/constants/theme';
import { Avatar } from '../../src/components/ui/Avatar';
import {
  currentUser,
  partner,
  household,
  mockChildren,
  mockMemories,
  mockDateIdeas,
  mockEvents,
  mockExpenses,
  mockInsights,
  familyMembers,
  mockBabyLogs,
  mockTimeline,
  mockPolls,
  mockActivityFeed,
  mockCountdowns,
  getUserName,
  getUserColor,
  getPeopleForMode,
  getDaysSinceTogether,
  modeGreetings,
} from '../../src/data/mock';
import { useModeStore } from '../../src/stores/modeStore';
import { useTaskStore } from '../../src/stores/taskStore';
import { useCalendarStore } from '../../src/stores/calendarStore';
import { useExpenseStore } from '../../src/stores/expenseStore';

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

export default function TogetherScreen() {
  const router = useRouter();
  const { mode } = useModeStore();
  const { tasks } = useTaskStore();
  const { events } = useCalendarStore();
  const { expenses, getBalance } = useExpenseStore();

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const daysTogether = getDaysSinceTogether();
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

  // --- Parenting: Emma's events and tasks ---
  const emmaTodayEvents = useMemo(
    () =>
      events
        .filter(
          (e) =>
            e.startDate.startsWith(todayStr) && e.createdBy === 'child-1',
        )
        .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [events, todayStr],
  );

  const emmaTodayTasks = useMemo(
    () => tasks.filter((t) => t.assignedTo === 'child-1' && t.dueDate === todayStr),
    [tasks, todayStr],
  );

  // --- Baby logs grouped by type ---
  const latestBabyLogs = useMemo(() => {
    const liamLogs = mockBabyLogs.filter((l) => l.childId === 'child-2');
    const latestFeed = liamLogs
      .filter((l) => l.type === 'feed')
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    const latestSleep = liamLogs
      .filter((l) => l.type === 'sleep')
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    const latestDiaper = liamLogs
      .filter((l) => l.type === 'diaper')
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    return { latestFeed, latestSleep, latestDiaper };
  }, []);

  const milestones = useMemo(
    () =>
      mockBabyLogs
        .filter((l) => l.type === 'milestone')
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [],
  );

  // --- Family: active polls ---
  const activePolls = useMemo(
    () => mockPolls.filter((p) => p.status === 'active'),
    [],
  );

  // --- Family: recent timeline ---
  const recentTimeline = useMemo(
    () =>
      [...mockTimeline]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3),
    [],
  );

  // --- Single mode: connections list ---
  const singleConnections = useMemo(() => {
    const connections: Array<{
      id: string;
      name: string;
      color: string;
      relationship: string;
    }> = [];
    connections.push({
      id: partner.id,
      name: partner.name,
      color: partner.color || '#10B981',
      relationship: 'Partner',
    });
    familyMembers.forEach((fm) => {
      const relLabel =
        fm.relationship.charAt(0).toUpperCase() + fm.relationship.slice(1);
      connections.push({
        id: fm.id,
        name: fm.name,
        color: fm.color,
        relationship: relLabel,
      });
    });
    return connections;
  }, []);

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
    const handlePersonTap = (personId: string, personName: string) => {
      const personEvents = events.filter(
        (e) =>
          e.startDate.startsWith(todayStr) &&
          (e.createdBy === personId || e.shared),
      );
      if (personEvents.length === 0) {
        Alert.alert(personName, 'No events scheduled for today.', [
          { text: 'OK' },
        ]);
      } else {
        const eventList = personEvents
          .map(
            (e) =>
              `\u2022 ${e.allDay ? 'All day' : format(parseISO(e.startDate), 'h:mm a')} \u2014 ${e.title}`,
          )
          .join('\n');
        Alert.alert(
          `${personName}'s Today`,
          `${personEvents.length} event${personEvents.length !== 1 ? 's' : ''} scheduled:\n\n${eventList}`,
          [{ text: 'OK' }],
        );
      }
    };

    return (
      <>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Circle</Text>
          <Text style={styles.headerSubtitle}>Your personal network</Text>
        </View>

        {/* Connections Card */}
        <View style={styles.whiteCard}>
          <Text style={styles.cardTitle}>Connections</Text>
          {singleConnections.map((person) => (
            <TouchableOpacity
              key={person.id}
              style={styles.connectionRow}
              activeOpacity={0.6}
              onPress={() => handlePersonTap(person.id, person.name)}
            >
              <Avatar name={person.name} size={40} color={person.color} />
              <Text style={styles.connectionName}>{person.name}</Text>
              <View
                style={[
                  styles.relationshipBadge,
                  { backgroundColor: person.color + '18' },
                ]}
              >
                <Text
                  style={[styles.relationshipBadgeText, { color: person.color }]}
                >
                  {person.relationship}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* My Stats This Week */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Stats This Week</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekStatsRow}
          style={styles.weekStatsScroll}
        >
          {[
            {
              value: weeklyEventsAttended,
              label: 'Events attended',
              icon: 'calendar-outline' as const,
              iconColor: colors.primary,
            },
            {
              value: weeklyTasksCompleted,
              label: 'Tasks completed',
              icon: 'checkmark-circle-outline' as const,
              iconColor: colors.success,
            },
            {
              value: `$${weeklyMoneySpent.toFixed(0)}`,
              label: 'Money spent',
              icon: 'wallet-outline' as const,
              iconColor: colors.warning,
            },
          ].map((stat, idx) => (
            <View key={idx} style={styles.weekStatCard}>
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
        </ScrollView>

        {/* Personal Insights */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Insights</Text>
        </View>
        <View style={styles.insightsContainer}>
          {mockInsights.map((insight) => {
            const accentColor =
              insightAccentColors[insight.type] || colors.primary;
            const iconName =
              (insightIcons[insight.icon] as keyof typeof Ionicons.glyphMap) ||
              'bulb-outline';
            return (
              <View key={insight.id} style={styles.insightCard}>
                <View
                  style={[
                    styles.insightAccentBar,
                    { backgroundColor: accentColor },
                  ]}
                />
                <View style={styles.insightContent}>
                  <View
                    style={[
                      styles.insightIconWrap,
                      { backgroundColor: accentColor + '18' },
                    ]}
                  >
                    <Ionicons
                      name={iconName as any}
                      size={16}
                      color={accentColor}
                    />
                  </View>
                  <View style={styles.insightTextWrap}>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <Text style={styles.insightDescription}>
                      {insight.description}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

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
              label: 'Insights',
              icon: 'bulb-outline' as const,
              onPress: () => router.push('/insights'),
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

        <View style={{ height: 100 }} />
      </>
    );
  };

  // ====================================================================
  // COUPLE MODE — "Us"
  // ====================================================================
  const renderCoupleMode = () => {
    const anniversaryDate = household.anniversary
      ? format(parseISO(household.anniversary), 'MMMM d, yyyy')
      : '';

    return (
      <>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Us</Text>
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
                name={partner.name}
                size={64}
                color={getUserColor(partner.id)}
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
        </View>

        {/* This Week Together Stats */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>This Week Together</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekStatsRow}
          style={styles.weekStatsScroll}
        >
          {[
            {
              value: weeklySharedEvents,
              label: 'Shared events',
              icon: 'calendar-outline' as const,
              iconColor: colors.primary,
            },
            {
              value: weeklyCompletedTasks,
              label: 'Tasks done together',
              icon: 'checkmark-circle-outline' as const,
              iconColor: colors.success,
            },
            {
              value: `$${weeklySpending.toFixed(0)}`,
              label: 'Spending',
              icon: 'wallet-outline' as const,
              iconColor: colors.warning,
            },
          ].map((stat, idx) => (
            <View key={idx} style={styles.weekStatCard}>
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
        </ScrollView>

        {/* Partner's Day */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{partner.name}'s Day</Text>
        </View>
        <View style={styles.whiteCard}>
          <View style={styles.partnerCardHeader}>
            <Avatar
              name={partner.name}
              size={28}
              color={getUserColor(partner.id)}
            />
            <Text style={styles.partnerCardName}>{partner.name}</Text>
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
            <Text style={styles.partnerEmpty}>No events scheduled</Text>
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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Memory Lane</Text>
          <TouchableOpacity
            onPress={() => router.push('/timeline')}
            activeOpacity={0.6}
          >
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.memoryRow}
          style={styles.memoryScroll}
        >
          {mockMemories.map((memory, idx) => (
            <View
              key={memory.id}
              style={[
                styles.memoryCard,
                {
                  backgroundColor: memoryTints[idx % memoryTints.length],
                },
              ]}
            >
              <Text style={styles.memoryEmoji}>{memory.emoji}</Text>
              <Text style={styles.memoryTitle} numberOfLines={2}>
                {memory.title}
              </Text>
              <Text style={styles.memoryDate}>
                {format(new Date(memory.date), 'MMM d, yyyy')}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Date Ideas */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Date Ideas</Text>
          <TouchableOpacity
            onPress={() => router.push('/date-ideas')}
            activeOpacity={0.6}
          >
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateIdeasRow}
          style={styles.dateIdeasScroll}
        >
          {mockDateIdeas.slice(0, 4).map((idea) => {
            const accentColor =
              dateIdeaCategoryAccent[idea.category] || '#8B5CF6';
            return (
              <View key={idea.id} style={styles.dateIdeaCard}>
                <View
                  style={[
                    styles.dateIdeaAccentStrip,
                    { backgroundColor: accentColor },
                  ]}
                />
                <View style={styles.dateIdeaContent}>
                  <Text style={styles.dateIdeaTitle} numberOfLines={2}>
                    {idea.title}
                  </Text>
                  <View style={styles.dateIdeaCostPill}>
                    <Text style={styles.dateIdeaCostText}>
                      ${idea.estimatedCost ?? 0}
                    </Text>
                  </View>
                  <Text style={styles.dateIdeaCategory}>{idea.category}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

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

        <View style={{ height: 100 }} />
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
      ...familyMembers.map((fm) => ({
        id: fm.id,
        name: fm.name,
        color: fm.color,
      })),
      ...mockChildren.map((c) => ({
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
          <Text style={styles.connectionSubtext}>
            {totalMembers} members
          </Text>
        </View>

        {/* Family This Week */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Family This Week</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekStatsRow}
          style={styles.weekStatsScroll}
        >
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
              value: `$${weeklySpending.toFixed(0)}`,
              label: 'Spending',
              icon: 'wallet-outline' as const,
              iconColor: colors.warning,
            },
          ].map((stat, idx) => (
            <View key={idx} style={styles.weekStatCard}>
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
        </ScrollView>

        {/* Family Activity Feed */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Activity Feed</Text>
        </View>
        <View style={styles.whiteCard}>
          {mockActivityFeed.map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.activityRow,
                idx < mockActivityFeed.length - 1 && styles.activityRowBorder,
              ]}
            >
              <Avatar
                name={getUserName(item.userId)}
                size={32}
                color={getUserColor(item.userId)}
              />
              <View style={styles.activityTextWrap}>
                <Text style={styles.activityDetail} numberOfLines={2}>
                  {item.detail}
                </Text>
                <Text style={styles.activityTime}>
                  {getRelativeTime(item.timestamp)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Family Timeline Preview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <TouchableOpacity
            onPress={() => router.push('/timeline')}
            activeOpacity={0.6}
          >
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.whiteCard}>
          {recentTimeline.map((entry, idx) => (
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
          ))}
        </View>

        {/* Family Polls */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Family Polls</Text>
        </View>
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

        <View style={{ height: 100 }} />
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
            {mockChildren.map((c) => c.name).join(' & ')}
          </Text>
        </View>

        {/* Kids Overview Card */}
        <View style={styles.whiteCard}>
          <Text style={styles.cardTitle}>Kids Overview</Text>
          {mockChildren.map((child) => {
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
          <Text style={styles.sectionTitle}>Baby Dashboard — Liam</Text>
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
                <Text style={styles.babyLogNote}>No logs yet</Text>
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
                <Text style={styles.babyLogNote}>No logs yet</Text>
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
                <Text style={styles.babyLogNote}>No logs yet</Text>
              )}
            </View>
          </View>
        </View>

        {/* Emma's Activities */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Emma's Activities</Text>
        </View>
        <View style={styles.whiteCard}>
          {emmaTodayEvents.length > 0 || emmaTodayTasks.length > 0 ? (
            <>
              {emmaTodayEvents.map((event) => (
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
              {emmaTodayTasks.map((task) => (
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
            <Text style={styles.partnerEmpty}>
              No activities scheduled for Emma today
            </Text>
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
            <Text style={styles.partnerEmpty}>No milestones recorded yet</Text>
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

        <View style={{ height: 100 }} />
      </>
    );
  };

  // ====================================================================
  // RENDER — calls the right mode function
  // ====================================================================
  const renderModeContent = () => {
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
const styles = StyleSheet.create({
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
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
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
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
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
  weekStatCard: {
    width: (SCREEN_WIDTH - spacing.xl * 2 - spacing.md * 2) / 3,
    minWidth: 105,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
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
    borderColor: '#FFFFFF',
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
    backgroundColor: '#F0F2F5',
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
  // MEMORY LANE
  // ----------------------------------------------------------------
  memoryScroll: {
    marginBottom: spacing.xl,
  },
  memoryRow: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  memoryCard: {
    width: MEMORY_CARD_WIDTH,
    borderRadius: radius.xl,
    padding: spacing.lg,
    justifyContent: 'flex-end',
    minHeight: 160,
    ...shadows.sm,
  },
  memoryEmoji: {
    fontSize: 36,
    marginBottom: spacing.md,
  },
  memoryTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  memoryDate: {
    ...typography.caption1,
    color: colors.textTertiary,
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
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    overflow: 'hidden',
    minHeight: 140,
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
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.lg,
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
    backgroundColor: '#FEF3C7',
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
});
