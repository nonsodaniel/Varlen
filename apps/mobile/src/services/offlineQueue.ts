import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { create } from 'zustand';

// ── Types ──

export interface QueuedRequest {
  id: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  endpoint: string;
  body?: Record<string, unknown>;
  headers: Record<string, string>;
  createdAt: number;
  retryCount: number;
}

interface OfflineState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
}

// ── Constants ──

const QUEUE_KEY = '@sivena_offline_queue';
const MAX_RETRIES = 5;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_QUEUE_SIZE = 200;

// ── Store (for UI reactivity) ──

export const useOfflineStore = create<OfflineState>(() => ({
  isOnline: true,
  pendingCount: 0,
  isSyncing: false,
}));

// ── Queue persistence ──

async function loadQueue(): Promise<QueuedRequest[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const items: QueuedRequest[] = JSON.parse(raw);
    // Drop expired items
    const now = Date.now();
    return items.filter((item) => now - item.createdAt < MAX_AGE_MS);
  } catch (err) {
    console.warn('[offlineQueue] loadQueue failed:', err);
    return [];
  }
}

async function saveQueue(queue: QueuedRequest[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    useOfflineStore.setState({ pendingCount: queue.length });
  } catch (err) { console.warn('[offlineQueue] saveQueue failed:', err); }
}

// ── Public API ──

// Buffer items added during flush so they aren't lost
let pendingDuringFlush: QueuedRequest[] = [];

export async function enqueueRequest(
  method: 'POST' | 'PATCH' | 'DELETE',
  endpoint: string,
  body: Record<string, unknown> | undefined,
  headers: Record<string, string>,
): Promise<void> {
  const item: QueuedRequest = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method,
    endpoint,
    body,
    headers,
    createdAt: Date.now(),
    retryCount: 0,
  };

  // If currently flushing, buffer the item to avoid read/write contention
  if (isFlushing) {
    pendingDuringFlush.push(item);
    return;
  }

  const queue = await loadQueue();
  // Drop oldest items if queue exceeds max size
  if (queue.length >= MAX_QUEUE_SIZE) {
    queue.splice(0, queue.length - MAX_QUEUE_SIZE + 1);
  }
  queue.push(item);
  await saveQueue(queue);
}

export async function getPendingCount(): Promise<number> {
  const queue = await loadQueue();
  return queue.length;
}

export async function clearQueue(): Promise<void> {
  await saveQueue([]);
}

// ── Sync engine ──

let isFlushing = false;

export async function flushQueue(apiBaseUrl: string): Promise<{ succeeded: number; failed: number }> {
  if (isFlushing) return { succeeded: 0, failed: 0 };
  isFlushing = true;
  pendingDuringFlush = [];
  useOfflineStore.setState({ isSyncing: true });

  let succeeded = 0;
  let failed = 0;

  try {
    const queue = await loadQueue();
    if (queue.length === 0) {
      return { succeeded: 0, failed: 0 };
    }

    const remaining: QueuedRequest[] = [];

    for (const item of queue) {
      try {
        const opts: RequestInit = {
          method: item.method,
          headers: { 'Content-Type': 'application/json', ...item.headers },
        };
        if (item.body && item.method !== 'DELETE') {
          opts.body = JSON.stringify(item.body);
        }

        const response = await fetch(`${apiBaseUrl}${item.endpoint}`, opts);

        if (response.ok || response.status === 404 || response.status === 409) {
          // Success, or resource already deleted/duplicate — drop from queue
          succeeded++;
        } else if (response.status === 401) {
          // Auth expired — drop (user will need to re-auth)
          failed++;
        } else {
          // Transient error — retry later
          item.retryCount++;
          if (item.retryCount < MAX_RETRIES) {
            remaining.push(item);
          } else {
            failed++;
          }
        }
      } catch (err) {
        console.warn('[offlineQueue] flushQueue request failed:', err);
        // Network error — keep in queue
        item.retryCount++;
        if (item.retryCount < MAX_RETRIES) {
          remaining.push(item);
        } else {
          failed++;
        }
      }
    }

    // Merge any items that were enqueued during flush
    remaining.push(...pendingDuringFlush);
    pendingDuringFlush = [];

    await saveQueue(remaining);
  } finally {
    isFlushing = false;
    useOfflineStore.setState({ isSyncing: false });
  }

  return { succeeded, failed };
}

// ── Network monitoring ──

let unsubscribeNetInfo: (() => void) | null = null;
let onSyncCompleteCallback: (() => void) | null = null;

export function startNetworkMonitoring(
  apiBaseUrl: string,
  onSyncComplete?: () => void,
): void {
  if (unsubscribeNetInfo) return;

  onSyncCompleteCallback = onSyncComplete ?? null;

  // Initial check
  NetInfo.fetch().then(async (state: NetInfoState) => {
    const online = !!(state.isConnected && state.isInternetReachable !== false);
    useOfflineStore.setState({ isOnline: online });
    if (online) {
      const result = await flushQueue(apiBaseUrl);
      if (result.succeeded > 0 && onSyncCompleteCallback) {
        onSyncCompleteCallback();
      }
    }
  });

  // Load initial pending count
  loadQueue().then((q) => {
    useOfflineStore.setState({ pendingCount: q.length });
  });

  // Subscribe to changes
  unsubscribeNetInfo = NetInfo.addEventListener(async (state: NetInfoState) => {
    const online = !!(state.isConnected && state.isInternetReachable !== false);
    const wasOffline = !useOfflineStore.getState().isOnline;
    useOfflineStore.setState({ isOnline: online });

    // Coming back online — flush the queue, then refetch data
    if (online && wasOffline) {
      const result = await flushQueue(apiBaseUrl);
      if (result.succeeded > 0 && onSyncCompleteCallback) {
        onSyncCompleteCallback();
      }
    }
  });
}

export function stopNetworkMonitoring(): void {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
}
