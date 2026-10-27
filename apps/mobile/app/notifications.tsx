import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  formatDistanceToNow,
  parseISO,
  isToday,
  isYesterday,
  isThisWeek,
  isThisYear,
  format,
} from 'date-fns';
import {
  typography,
  spacing,
  radius,
} from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useNotificationStore } from '../src/stores/notificationStore';
import { navigateToNotification } from '../src/utils/notificationNavigation';
import type { Notification } from '../src/types';

const typeConfig: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  chore: { icon: 'construct-outline', color: '#F59E0B' },
  task: { icon: 'checkmark-circle-outline', color: '#F59E0B' },
  event: { icon: 'calendar-outline', color: '#3B82F6' },
  activity: { icon: 'pulse-outline', color: '#10B981' },
  system: { icon: 'information-circle-outline', color: '#EF4444' },
  reminder: { icon: 'alarm-outline', color: '#8B5CF6' },
  expense: { icon: 'card-outline', color: '#10B981' },
  poll: { icon: 'bar-chart-outline', color: '#EC4899' },
  goal: { icon: 'flag-outline', color: '#F97316' },
  memory: { icon: 'heart-outline', color: '#EF4444' },
  chat: { icon: 'chatbubbles-outline', color: '#6C63FF' },
  message: { icon: 'chatbubbles-outline', color: '#6C63FF' },
};

function getConfig(type: string) {
  return typeConfig[type] ?? { icon: 'notifications-outline' as const, color: '#6B7280' };
}

function getDateGroup(timestamp: string): string {
  try {
    const date = parseISO(timestamp);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    if (isThisWeek(date)) return 'This Week';
    // Show actual date for older notifications
    return isThisYear(date) ? format(date, 'MMM d') : format(date, 'MMM d, yyyy');
  } catch {
    return 'Earlier';
  }
}

function formatTime(timestamp: string): string {
  try {
    return formatDistanceToNow(parseISO(timestamp), { addSuffix: true });
  } catch {
    return '';
  }
}

// Fixed groups shown first; date-based groups are appended sorted newest-first
const FIXED_GROUPS = ['Today', 'Yesterday', 'This Week'];

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { notifications, markRead, markAllRead, dismissNotification, clearAllNotifications, getUnreadCount, fetchNotifications, isLoading } =
    useNotificationStore();
  const unreadCount = getUnreadCount();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    fetchNotifications();
  }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  // Group notifications by date
  const sections = useMemo(() => {
    const groups = new Map<string, Notification[]>();

    // Sort by timestamp descending
    const sorted = [...notifications].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    for (const notification of sorted) {
      const group = getDateGroup(notification.timestamp);
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(notification);
    }

    // Fixed groups first (Today → Yesterday → This Week), then date groups newest-first
    const fixedSections = FIXED_GROUPS
      .filter((g) => groups.has(g))
      .map((title) => ({ title, data: groups.get(title)! }));

    const dateSections = [...groups.keys()]
      .filter((g) => !FIXED_GROUPS.includes(g))
      .map((title) => ({ title, data: groups.get(title)! }))
      // Sort by newest notification in each group, descending
      .sort((a, b) => new Date(b.data[0].timestamp).getTime() - new Date(a.data[0].timestamp).getTime());

    return [...fixedSections, ...dateSections];
  }, [notifications]);

  const handlePress = (notification: Notification) => {
    markRead(notification.id);
    navigateToNotification(router, notification.resourceType, notification.resourceId);
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const config = getConfig(item.type);
    const timeAgo = formatTime(item.timestamp);

    return (
      <TouchableOpacity
        style={[styles.card, !item.read && styles.cardUnread]}
        onPress={() => handlePress(item)}
        activeOpacity={0.6}
      >
        <View style={[styles.iconCircle, { backgroundColor: config.color + '15' }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
          {!item.read && <View style={styles.unreadDot} />}
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, !item.read && styles.cardTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardBody} numberOfLines={2}>
            {item.body}
          </Text>
          {timeAgo ? <Text style={styles.cardTime}>{timeAgo}</Text> : null}
        </View>
        <TouchableOpacity
          onPress={() => dismissNotification(item.id)}
          style={styles.dismissBtn}
          activeOpacity={0.6}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="close" size={16} color={colors.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string; data: Notification[] } }) => {
    const sectionUnread = section.data.filter((n) => !n.read).length;
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        {sectionUnread > 0 && (
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{sectionUnread} new</Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="notifications-off-outline" size={36} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>All caught up!</Text>
        <Text style={styles.emptySubtitle}>
          No notifications right now. We'll let you know when something happens.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        {/* Row 1: back + actions */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllRead} activeOpacity={0.7} style={styles.markAllBtn}>
                <Ionicons name="checkmark-done-outline" size={16} color={colors.primary} />
                <Text style={styles.markAllText}>Read all</Text>
              </TouchableOpacity>
            )}
            {notifications.length > 0 && (
              <TouchableOpacity onPress={clearAllNotifications} activeOpacity={0.7} style={styles.clearAllBtn}>
                <Ionicons name="trash-outline" size={15} color={colors.error} />
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Row 2: title + badge */}
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      <SectionList keyboardDismissMode="on-drag"
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={<View style={{ height: spacing['3xl'] }} />}
        contentContainerStyle={sections.length === 0 ? styles.contentEmpty : styles.content}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        removeClippedSubviews
        maxToRenderPerBatch={15}
        initialNumToRender={20}
      />
    </View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  headerTitle: {
    ...typography.largeTitle,
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.error,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    ...typography.caption2,
    color: colors.textInverse,
    fontWeight: '700',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  markAllText: {
    ...typography.caption1,
    color: colors.primary,
    fontWeight: '600',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.error + '15',
  },
  clearAllText: {
    ...typography.caption1,
    color: colors.error,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  contentEmpty: {
    paddingHorizontal: spacing.xl,
    flex: 1,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.subhead,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  sectionBadgeText: {
    ...typography.caption2,
    color: colors.primary,
    fontWeight: '600',
  },

  // Notification cards
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardUnread: {
    backgroundColor: colors.primaryLight + '30',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    position: 'relative',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.subhead,
    color: colors.text,
    marginBottom: 2,
  },
  cardTitleUnread: {
    fontWeight: '700',
  },
  cardBody: {
    ...typography.callout,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  cardTime: {
    ...typography.caption2,
    color: colors.textTertiary,
  },
  unreadDot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error + '18',
    marginLeft: spacing.sm,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.title3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing['2xl'],
    lineHeight: 22,
  },
});
