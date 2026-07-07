import { AppState } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { showLocalNotification, setBadgeCount } from './pushNotifications';

const WS_URL = 'https://sivena-api-production.up.railway.app';

let socket: Socket | null = null;
let initPromise: Promise<void> | null = null;

export function initSocket() {
  const token = useAuthStore.getState().accessToken;
  if (!token || socket?.connected) return;

  // Prevent concurrent init — all callers share one init promise
  if (initPromise) return;

  initPromise = (async () => {
    try {
      // Disconnect stale socket if it exists but isn't connected
      if (socket && !socket.connected) {
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

      socket.on('connect', () => {
        console.log('[Socket] Connected');
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

      socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
      });

      socket.on('connect_error', (error) => {
        console.log('[Socket] Connection error:', error.message);
      });
    } finally {
      initPromise = null;
    }
  })();
}

export function disconnectSocket() {
  initPromise = null;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
