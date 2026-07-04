import React, { useEffect, useCallback, useState } from 'react';
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
import { formatDistanceToNow, parseISO } from 'date-fns';
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

const typeColors: Record<string, string> = {
  chore: '#F59E0B',
  event: '#3B82F6',
  activity: '#10B981',
  system: '#EF4444',
  reminder: '#8B5CF6',
};

const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  chore: 'construct-outline',
  event: 'calendar-outline',
  activity: 'pulse-outline',
  system: 'information-circle-outline',
  reminder: 'alarm-outline',
};

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

  const handlePress = (notification: Notification) => {
    markRead(notification.id);
    navigateToNotification(router, notification.resourceType, notification.resourceId);
  };

  const renderNotification = (notification: Notification) => {
    const iconColor = typeColors[notification.type] ?? '#6B7280';
    const iconName = typeIcons[notification.type] ?? 'notifications-outline';
    let timeAgo = '';
    try {
      timeAgo = formatDistanceToNow(parseISO(notification.timestamp), {
        addSuffix: true,
      });
    } catch {
      timeAgo = '';
    }

    return (
      <TouchableOpacity
        key={notification.id}
        style={[
          styles.card,
          !notification.read && styles.cardUnread,
        ]}
        activeOpacity={0.7}
        onPress={() => handlePress(notification)}
      >
        <View
          style={[styles.iconCircle, { backgroundColor: iconColor + '20' }]}
        >
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.cardBody} numberOfLines={2}>
            {notification.body}
          </Text>
          {timeAgo ? <Text style={styles.cardTime}>{timeAgo}</Text> : null}
        </View>
      </TouchableOpacity>
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
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={markAllRead} activeOpacity={0.7}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="checkmark-circle-outline"
              size={64}
              color={colors.textTertiary}
            />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>
              No notifications to show right now.
            </Text>
          </View>
        ) : (
          notifications.map(renderNotification)
        )}

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
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
    ...typography.caption1,
    color: colors.textInverse,
  },
  markAllText: {
    ...typography.callout,
    color: colors.primary,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  cardTime: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    ...typography.title2,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
