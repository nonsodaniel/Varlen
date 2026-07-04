import { create } from 'zustand';
import type { Notification } from '../types';
import { apiGet, apiPatch, apiPost } from '../services/api';

interface NotificationState {
  notifications: Notification[];
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await apiGet<{ data: any[] }>('/notifications?limit=50');
      const notifications: Notification[] = response.data.map((n: any) => ({
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
    set((state) => ({
      notifications: [notification, ...state.notifications],
    })),

  markRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
    apiPatch(`/notifications/${id}/read`).catch(() => {});
  },

  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
    apiPost('/notifications/read-all', {}).catch(() => {});
  },

  getUnreadCount: () => get().notifications.filter((n) => !n.read).length,
}));
