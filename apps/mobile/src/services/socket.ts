import { AppState, AppStateStatus } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { showLocalNotification, setBadgeCount } from './pushNotifications';

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

        // Show local push notification when app is in background or inactive
        if (AppState.currentState !== 'active') {
          showLocalNotification(
            notification.title,
            notification.body,
            {
              type: notification.type?.toLowerCase(),
              resourceType: notification.resourceType,
              resourceId: notification.resourceId,
            },
            notification.type?.toLowerCase(),
          );
        }

        // Update badge count after notification is added to store
        const unread = useNotificationStore.getState().getUnreadCount();
        setBadgeCount(unread);
      });

      // Listen for realtime data updates and refresh relevant stores
      socket.on('expense:created', () => refreshStoreData('expenses'));
      socket.on('expense:updated', () => refreshStoreData('expenses'));
      socket.on('task:created', () => refreshStoreData('tasks'));
      socket.on('task:updated', () => refreshStoreData('tasks'));
      socket.on('event:created', () => refreshStoreData('events'));
      socket.on('event:updated', () => refreshStoreData('events'));
      socket.on('list:created', () => refreshStoreData('lists'));
      socket.on('list:updated', () => refreshStoreData('lists'));
      socket.on('poll:created', () => refreshStoreData('polls'));
      socket.on('poll:updated', () => refreshStoreData('polls'));
      socket.on('goal:created', () => refreshStoreData('goals'));
      socket.on('goal:updated', () => refreshStoreData('goals'));
      socket.on('memory:created', () => refreshStoreData('memories'));

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
    if (token && (!socket || !socket.connected)) {
      // Reconnect when app returns to foreground
      disconnectSocket();
      initSocket();
    }
    // Refresh notifications when app becomes active
    useNotificationStore.getState().fetchNotifications();
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
        require('../stores/expenseStore').useExpenseStore.getState().fetchExpenses();
        break;
      case 'tasks':
        require('../stores/taskStore').useTaskStore.getState().fetchTasks();
        break;
      case 'events':
        require('../stores/calendarStore').useCalendarStore.getState().fetchEvents();
        break;
      case 'lists':
        require('../stores/listStore').useListStore.getState().fetchLists();
        break;
      case 'polls':
        require('../stores/pollStore').usePollStore.getState().fetchPolls();
        break;
      case 'goals':
        require('../stores/goalStore').useGoalStore.getState().fetchGoals();
        break;
      case 'memories':
        require('../stores/memoryStore').useMemoryStore.getState().fetchMemories();
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
