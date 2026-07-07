import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  formatDistanceToNow,
  parseISO,
  isToday,
  isYesterday,
  isThisWeek,
} from 'date-fns';
import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
} from '../src/constants/theme';
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
    return 'Earlier';
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

// Keep groups in chronological order
const GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'Earlier'];

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, markRead, markAllRead, getUnreadCount, fetchNotifications, isLoading } =
    useNotificationStore();
  const unreadCount = getUnreadCount();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

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

    return GROUP_ORDER
      .filter((g) => groups.has(g))
      .map((title) => ({ title, data: groups.get(title)! }));
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
        {!item.read && <View style={styles.unreadDot} />}
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} activeOpacity={0.7} style={styles.markAllBtn}>
            <Ionicons name="checkmark-done-outline" size={16} color={colors.primary} />
            <Text style={styles.markAllText}>Read all</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      <SectionList
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.headline,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
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
