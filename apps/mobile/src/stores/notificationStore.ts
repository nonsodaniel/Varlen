import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Notification } from '../types';
import { apiGet, apiPatch, apiPost, apiDelete } from '../services/api';

const MAX_NOTIFICATIONS = 100;

interface NotificationState {
  notifications: Notification[];
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  getUnreadCount: () => number;
  clear: () => void;
}

let _lastFetchedAt = 0;

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
  notifications: [],
  isLoading: false,

  fetchNotifications: async () => {
    const hasData = get().notifications.length > 0;
    if (hasData && Date.now() - _lastFetchedAt < 30000) return;
    set({ isLoading: !hasData });
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
      _lastFetchedAt = Date.now();
      set({ notifications, isLoading: false });
    } catch (err) {
      console.warn('[notificationStore] fetchNotifications failed:', err);
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

  dismissNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
    // Best-effort mark as read + delete on backend
    apiPatch(`/notifications/${id}/read`).catch(() => {});
    apiDelete(`/notifications/${id}`).catch(() => {});
  },

  clearAllNotifications: () => {
    set({ notifications: [] });
    apiPost('/notifications/read-all', {}).catch(() => {});
  },

  getUnreadCount: () => get().notifications.filter((n) => !n.read).length,

  clear: () => set({ notifications: [], isLoading: false }),
    }),
    {
      name: 'sivena-notifications',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ notifications: state.notifications }),
    },
  ),
);
