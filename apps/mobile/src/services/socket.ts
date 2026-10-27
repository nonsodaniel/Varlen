import { AppState, AppStateStatus } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { setBadgeCount } from './pushNotifications';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || process.env.EXPO_PUBLIC_API_URL?.replace('/api/v1', '') || 'https://sivena-api-production.up.railway.app';

let socket: Socket | null = null;
let initPromise: Promise<void> | null = null;
let appStateSubscription: { remove: () => void } | null = null;

export function initSocket() {
  const token = useAuthStore.getState().accessToken;
  if (!token || socket?.connected) return;

  // Prevent concurrent init — all callers share one init promise
  if (initPromise) return;

  initPromise = (async () => {
    try {
      // Disconnect stale socket if it exists but isn't connected
      if (socket && !socket.connected) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
      }

      socket = io(`${WS_URL}/ws`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });

      socket.on('notification:new', (notification) => {
        const mapped = {
          id: notification.id,
          title: notification.title,
          body: notification.body,
          timestamp: notification.createdAt,
          read: false,
          type: notification.type?.toLowerCase() ?? 'activity',
          resourceType: notification.resourceType,
          resourceId: notification.resourceId,
        };

        // Add to in-app notification store
        useNotificationStore.getState().addNotification(mapped);

        // Update badge count — display is handled by the backend's push notification
        const unread = useNotificationStore.getState().getUnreadCount();
        setBadgeCount(unread);
      });

      // Listen for realtime data updates and refresh relevant stores
      socket.on('expense:created', () => refreshStoreData('expenses'));
      socket.on('expense:updated', () => refreshStoreData('expenses'));
      socket.on('task:created', () => refreshStoreData('tasks'));
      socket.on('task:updated', () => refreshStoreData('tasks'));
      socket.on('task:deleted', () => refreshStoreData('tasks'));
      socket.on('event:created', () => refreshStoreData('events'));
      socket.on('event:updated', () => refreshStoreData('events'));
      socket.on('event:deleted', () => refreshStoreData('events'));
      socket.on('list:created', () => refreshStoreData('lists'));
      socket.on('list:updated', () => refreshStoreData('lists'));
      socket.on('poll:created', () => refreshStoreData('polls'));
      socket.on('poll:updated', () => refreshStoreData('polls'));
      socket.on('goal:created', () => refreshStoreData('goals'));
      socket.on('goal:updated', () => refreshStoreData('goals'));
      socket.on('memory:created', () => refreshStoreData('memories'));
      socket.on('memory:updated', () => refreshStoreData('memories'));

      // Household membership events — refresh household data immediately so
      // the inviting partner sees the new member without requiring a re-login
      socket.on('household:member_joined', () => refreshStoreData('household'));
      socket.on('household:member_removed', () => refreshStoreData('household'));
      socket.on('household:member_left', () => refreshStoreData('household'));
      socket.on('household:deleted', (data: any) => {
        const householdId: string | undefined = data?.householdId;
        if (householdId) {
          try { require('../stores/chatStore').useChatStore.getState().clearHousehold(householdId); } catch { /* ignore */ }
        }
        refreshStoreData('household');
        try {
          const { Alert } = require('react-native');
          Alert.alert(
            'Household Deleted',
            'This household has been deleted by the owner.',
            [{
              text: 'OK',
              onPress: () => {
                try {
                  const { router } = require('expo-router');
                  router.replace('/(tabs)/');
                } catch { /* navigation not ready */ }
              },
            }],
            { cancelable: false },
          );
        } catch { /* ignore */ }
      });

      socket.on('household:partnership_ended', (data: any) => {
        const currentUserId = useAuthStore.getState().user?.id;
        const endedBy: string | undefined = data?.endedBy;
        const householdId: string | undefined = data?.householdId;

        // Clear local couple-space data for both parties
        if (householdId) {
          try { require('../stores/chatStore').useChatStore.getState().clearHousehold(householdId); } catch { /* ignore */ }
        }

        refreshStoreData('household');

        // Only show alert + navigate for the partner who did NOT initiate the removal
        if (currentUserId && endedBy && endedBy !== currentUserId) {
          const { Alert } = require('react-native');
          Alert.alert(
            'Partner Removed',
            'Your partner has ended the shared space. All shared activities have been removed.',
            [{
              text: 'OK',
              onPress: () => {
                try {
                  const { router } = require('expo-router');
                  router.replace('/(tabs)/');
                } catch { /* navigation not ready */ }
              },
            }],
            { cancelable: false },
          );
        }
      });

      // Chat events
      socket.on('chat:message', (message: any) => {
        try {
          // Fall back to current householdId if server omits it from the payload
          const householdId = message.householdId
            ?? require('../stores/householdStore').useHouseholdStore.getState().householdId;
          if (!householdId) return; // Can't route message without a household
          require('../stores/chatStore').useChatStore.getState().receiveMessage({
            id: message.id ?? message._id,
            householdId,
            senderId: message.senderId ?? message.userId ?? message.sender?.id ?? message.sender?.userId ?? message.authorId ?? message.author?.id,
            senderName: message.senderName ?? message.sender?.name ?? message.sender?.displayName ?? message.authorName ?? message.author?.name ?? 'Unknown',
            senderAvatar: message.senderAvatar ?? message.sender?.avatarUrl ?? message.sender?.avatar ?? message.author?.avatarUrl,
            type: message.type ?? 'text',
            content: message.content ?? message.text ?? '',
            poll: message.poll,
            activityCard: message.activityCard ?? message.metadata?.activityCard,
            dateIdea: message.dateIdea ?? message.metadata?.dateIdea,
            location: message.location ?? message.metadata?.location,
            replyTo: message.replyTo ?? message.metadata?.replyTo,
            createdAt: message.createdAt ?? message.timestamp ?? new Date().toISOString(),
            readBy: message.readBy ?? [],
          });
        } catch (err) { console.warn('[socket] chat:message handler failed:', err); }
      });

      socket.on('chat:message:deleted', (data: any) => {
        try {
          const householdId = data.householdId;
          const messageId = data.messageId;
          if (!householdId || !messageId) return;
          require('../stores/chatStore').useChatStore.setState((s: any) => {
            const existing = s.messagesByHousehold[householdId] ?? [];
            return {
              messagesByHousehold: {
                ...s.messagesByHousehold,
                [householdId]: existing.filter((m: any) => m.id !== messageId),
              },
              starredMessages: s.starredMessages.filter((id: string) => id !== messageId),
            };
          });
        } catch (err) { console.warn('[socket] chat:message:deleted handler failed:', err); }
      });

      socket.on('chat:typing', (data: any) => {
        try {
          if (data.userId && data.householdId) {
            require('../stores/chatStore').useChatStore.getState().setTyping(data.householdId, {
              userId: data.userId,
              name: data.name ?? 'Someone',
              expiresAt: Date.now() + 4000,
            });
          }
        } catch (err) { console.warn('[socket] chat:typing handler failed:', err); }
      });

      socket.on('chat:vote', (data: any) => {
        try {
          if (data.householdId && data.messageId && data.message) {
            // Patch the specific message in-place so vote counts update instantly
            // without triggering a potentially-throttled full re-fetch
            require('../stores/chatStore').useChatStore.setState((s: any) => {
              const existing = s.messagesByHousehold[data.householdId] ?? [];
              const updated = existing.map((m: any) => m.id === data.messageId ? data.message : m);
              return { messagesByHousehold: { ...s.messagesByHousehold, [data.householdId]: updated } };
            });
          }
        } catch { /* ignore */ }
      });

      socket.on('chat:read', (data: any) => {
        try {
          const { householdId, userId } = data;
          if (!householdId || !userId) return;
          require('../stores/chatStore').useChatStore.getState().markReadByUser(householdId, userId);
        } catch (err) { console.warn('[socket] chat:read handler failed:', err); }
      });

      // Reaction events
      socket.on('reaction:new', (reaction: any) => {
        try {
          require('../stores/reactionStore').useReactionStore.getState().handleSocketNew(reaction);
        } catch (err) { console.warn('[socket] reaction:new handler failed:', err); }
      });
      socket.on('reaction:removed', (data: any) => {
        try {
          require('../stores/reactionStore').useReactionStore.getState().handleSocketRemoved(data);
        } catch (err) { console.warn('[socket] reaction:removed handler failed:', err); }
      });

      // Socket lifecycle error handlers
      socket.on('connect_error', (err) => {
        console.warn('[socket] connection error:', err.message);
      });
      socket.on('error', (err) => {
        console.warn('[socket] error:', err);
      });
      socket.on('disconnect', (reason) => {
        if (reason === 'io server disconnect') {
          // Server force-disconnected — re-init when app is next active
          console.warn('[socket] server disconnected socket');
        }
      });

      // Set up AppState listener to reconnect when app comes to foreground
      if (!appStateSubscription) {
        appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
      }
    } finally {
      initPromise = null;
    }
  })();
}

function handleAppStateChange(nextState: AppStateStatus) {
  if (nextState === 'active') {
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      // User logged out — tear down socket and listener
      disconnectSocket();
      return;
    }
    if (!socket || !socket.connected) {
      // Reconnect when app returns to foreground
      disconnectSocket();
      initSocket();
    }
    // Refresh notifications and clear badge when app becomes active
    useNotificationStore.getState().fetchNotifications();
    try {
      require('./pushNotifications').clearBadge();
    } catch { /* pushNotifications not available yet */ }
  }
}

/** Debounce store refreshes to prevent rapid-fire fetches from multiple socket events */
const refreshTimers = new Map<string, ReturnType<typeof setTimeout>>();

function refreshStoreData(type: string) {
  // Clear any pending refresh for this type
  const existing = refreshTimers.get(type);
  if (existing) clearTimeout(existing);

  // Debounce by 500ms — if multiple events arrive quickly, only fetch once
  refreshTimers.set(
    type,
    setTimeout(() => {
      refreshTimers.delete(type);
      _doRefresh(type);
    }, 500),
  );
}

/** Lazy-import stores only when needed to avoid circular deps at module load */
function _doRefresh(type: string) {
  try {
    switch (type) {
      case 'expenses':
        require('../stores/expenseStore').useExpenseStore.getState().fetchExpenses(true);
        break;
      case 'tasks':
        require('../stores/taskStore').useTaskStore.getState().fetchTasks(true);
        break;
      case 'events':
        require('../stores/calendarStore').useCalendarStore.getState().fetchEvents(true);
        break;
      case 'lists':
        require('../stores/listStore').useListStore.getState().fetchLists(true);
        break;
      case 'polls':
        require('../stores/pollStore').usePollStore.getState().fetchPolls(true);
        break;
      case 'goals':
        require('../stores/goalStore').useGoalStore.getState().fetchGoals(true);
        break;
      case 'memories':
        require('../stores/memoryStore').useMemoryStore.getState().fetchMemories(true);
        break;
      case 'household':
        // Refresh household membership + activity feed so both partners see
        // member joins, removals, and partnership changes in real time
        require('../stores/householdStore').useHouseholdStore.getState().fetchHousehold();
        require('../stores/activityStore').useActivityStore.getState().fetchActivity();
        break;
    }
  } catch {
    // Store not available yet — ignore
  }
}

export function disconnectSocket() {
  initPromise = null;
  // Clear all pending debounced refreshes
  for (const timer of refreshTimers.values()) clearTimeout(timer);
  refreshTimers.clear();
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
