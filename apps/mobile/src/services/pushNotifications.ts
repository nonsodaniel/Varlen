import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost } from './api';

// ── Constants ──

const PUSH_TOKEN_KEY = '@sivena_push_token';
const PREFS_KEY = '@sivena_notification_prefs';

export interface NotificationPrefs {
  enabled: boolean;
  expenses: boolean;
  events: boolean;
  tasks: boolean;
  reminders: boolean;
  social: boolean; // polls, activity
}

const DEFAULT_PREFS: NotificationPrefs = {
  enabled: true,
  expenses: true,
  events: true,
  tasks: true,
  reminders: true,
  social: true,
};

// ── Configure notification behavior ──

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Push token registration ──

let registrationPromise: Promise<string | null> | null = null;

export async function registerForPushNotifications(): Promise<string | null> {
  // Prevent concurrent registrations — share the same promise
  if (registrationPromise) return registrationPromise;

  registrationPromise = _doRegister();
  try {
    return await registrationPromise;
  } finally {
    registrationPromise = null;
  }
}

async function _doRegister(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Push] Must use physical device for push notifications');
    return null;
  }

  // Check existing permission
  // Note: PermissionResponse.granted exists at runtime but expo SDK 57
  // doesn't re-export the type from expo-modules-core, so TS can't see it
  const perms = await Notifications.getPermissionsAsync();
  let finalStatus = (perms as any).granted as boolean;

  // Request permission if not granted
  if (!finalStatus) {
    const reqPerms = await Notifications.requestPermissionsAsync();
    finalStatus = (reqPerms as any).granted as boolean;
  }

  if (!finalStatus) {
    console.log('[Push] Permission not granted');
    return null;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
    });

    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B5CF6',
    });

    await Notifications.setNotificationChannelAsync('expenses', {
      name: 'Expenses',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#10B981',
    });
  }

  // Get push token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'cdbcc2a8-ede1-41d0-8e14-e27dbe1fa285',
    });
    const token = tokenData.data;

    // Only send to backend if token changed
    const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (storedToken !== token) {
      await sendTokenToBackend(token);
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    }

    return token;
  } catch (error) {
    console.log('[Push] Error getting push token:', error);
    return null;
  }
}

async function sendTokenToBackend(token: string): Promise<void> {
  try {
    await apiPost('/notifications/push-token', {
      token,
      platform: Platform.OS,
    });
  } catch {
    // Backend may not support this yet — fail silently
    console.log('[Push] Could not register token with backend');
  }
}

// ── Local notifications (triggered from socket events) ──

export async function showLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  categoryId?: string,
): Promise<void> {
  const prefs = await getNotificationPrefs();
  if (!prefs.enabled) return;

  // Check category-specific prefs
  if (categoryId && !isCategoryEnabled(prefs, categoryId)) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
      sound: 'default',
      ...(Platform.OS === 'android' && {
        channelId: categoryId === 'reminder' ? 'reminders'
          : categoryId === 'expense' ? 'expenses'
          : 'default',
      }),
    },
    trigger: null, // Immediate
  });
}

// ── Scheduled notifications (e.g., event reminders) ──

export async function scheduleEventReminder(
  eventId: string,
  title: string,
  date: Date,
  minutesBefore: number = 15,
): Promise<string | null> {
  const prefs = await getNotificationPrefs();
  if (!prefs.enabled || !prefs.events) return null;

  const triggerDate = new Date(date.getTime() - minutesBefore * 60 * 1000);
  if (triggerDate <= new Date()) return null; // Already past

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Upcoming Event',
      body: `${title} starts in ${minutesBefore} minutes`,
      data: { type: 'event', resourceId: eventId },
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'reminders' }),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });

  return id;
}

export async function cancelScheduledNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── Badge management ──

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

// ── Notification preferences ──

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PREFS;
}

export async function setNotificationPrefs(prefs: Partial<NotificationPrefs>): Promise<void> {
  const current = await getNotificationPrefs();
  const updated = { ...current, ...prefs };
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updated));
}

function isCategoryEnabled(prefs: NotificationPrefs, category: string): boolean {
  switch (category) {
    case 'expense': return prefs.expenses;
    case 'event': return prefs.events;
    case 'chore':
    case 'task': return prefs.tasks;
    case 'reminder': return prefs.reminders;
    case 'activity':
    case 'system': return prefs.social;
    default: return true;
  }
}
