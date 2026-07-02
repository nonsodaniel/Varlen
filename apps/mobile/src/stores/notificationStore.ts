import { create } from 'zustand';
import type { Notification } from '../types';
import { format, subHours, subDays } from 'date-fns';

const now = new Date();

const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    title: 'Chore reminder',
    body: 'Take out trash is due today',
    timestamp: format(subHours(now, 1), "yyyy-MM-dd'T'HH:mm:ss"),
    read: false,
    type: 'chore',
    icon: 'trash',
  },
  {
    id: 'notif-2',
    title: 'Date night tonight!',
    body: 'Dinner reservation at The Italian Place at 7pm',
    timestamp: format(subHours(now, 3), "yyyy-MM-dd'T'HH:mm:ss"),
    read: false,
    type: 'event',
    icon: 'calendar',
  },
  {
    id: 'notif-3',
    title: 'Jordan completed a task',
    body: 'Pay electricity bill has been marked done',
    timestamp: format(subHours(now, 5), "yyyy-MM-dd'T'HH:mm:ss"),
    read: false,
    type: 'activity',
    icon: 'checkmark-circle',
  },
  {
    id: 'notif-4',
    title: 'System update',
    body: 'Valen v2.0 is now available with new features',
    timestamp: format(subDays(now, 1), "yyyy-MM-dd'T'HH:mm:ss"),
    read: true,
    type: 'system',
    icon: 'information-circle',
  },
  {
    id: 'notif-5',
    title: "Don't forget!",
    body: 'Dentist appointment tomorrow at 2pm',
    timestamp: format(subDays(now, 1), "yyyy-MM-dd'T'HH:mm:ss"),
    read: false,
    type: 'reminder',
    icon: 'alarm',
  },
  {
    id: 'notif-6',
    title: 'Grocery run today',
    body: 'Weekly grocery shopping at Whole Foods at 10am',
    timestamp: format(subDays(now, 2), "yyyy-MM-dd'T'HH:mm:ss"),
    read: true,
    type: 'event',
    icon: 'calendar',
  },
];

interface NotificationState {
  notifications: Notification[];
  markRead: (id: string) => void;
  markAllRead: () => void;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: mockNotifications,

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  getUnreadCount: () => get().notifications.filter((n) => !n.read).length,
}));
