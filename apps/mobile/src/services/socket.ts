import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';

const WS_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://sivena-api-production.up.railway.app';

let socket: Socket | null = null;

export function initSocket() {
  const token = useAuthStore.getState().accessToken;
  if (!token || socket?.connected) return;

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
    useNotificationStore.getState().addNotification({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      timestamp: notification.createdAt,
      read: false,
      type: notification.type?.toLowerCase() ?? 'activity',
      resourceType: notification.resourceType,
      resourceId: notification.resourceId,
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.log('[Socket] Connection error:', error.message);
  });
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
