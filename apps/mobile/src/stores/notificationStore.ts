import { create } from 'zustand';
import type { Notification } from '../types';
import { apiGet, apiPatch, apiPost } from '../services/api';

const MAX_NOTIFICATIONS = 100;

interface NotificationState {
  notifications: Notification[];
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  getUnreadCount: () => number;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await apiGet<any>('/notifications?limit=50');
      const raw = response.data ?? response;
      const notifications: Notification[] = (Array.isArray(raw) ? raw : []).map((n: any) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        timestamp: n.createdAt,
        read: n.read,
        type: n.type?.toLowerCase() ?? 'activity',
        resourceType: n.resourceType,
        resourceId: n.resourceId,
      }));
      set({ notifications, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addNotification: (notification) =>
    set((state) => {
      // Deduplicate — skip if notification with same id already exists
      if (state.notifications.some((n) => n.id === notification.id)) {
        return state;
      }
      // Cap stored notifications to prevent unbounded growth
      const updated = [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
      return { notifications: updated };
    }),

  markRead: (id) => {
    const prev = get().notifications;
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
    apiPatch(`/notifications/${id}/read`).catch(() => {
      set({ notifications: prev });
    });
  },

  markAllRead: () => {
    const prev = get().notifications;
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
    apiPost('/notifications/read-all', {}).catch(() => {
      set({ notifications: prev });
    });
  },

  getUnreadCount: () => get().notifications.filter((n) => !n.read).length,

  clear: () => set({ notifications: [], isLoading: false }),
}));
