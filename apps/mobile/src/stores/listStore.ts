import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShoppingList, ShoppingItem } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { getResolvedHouseholdId, ensureHouseholdId } from './householdStore';
import { useCircleStore } from './circleStore';
import { useAuthStore } from './authStore';

interface ListState {
  lists: ShoppingList[];
  isLoading: boolean;
  fetchLists: (force?: boolean) => Promise<void>;
  addList: (list: Omit<ShoppingList, 'id' | 'items' | 'updatedAt'> & { items?: ShoppingItem[] }) => Promise<string>;
  deleteList: (id: string) => Promise<void>;
  addItem: (listId: string, item: Omit<ShoppingItem, 'id'>) => Promise<void>;
  updateItem: (listId: string, itemId: string, updates: Pick<ShoppingItem, 'name' | 'quantity'> & { unit?: string }) => Promise<void>;
  toggleItem: (listId: string, itemId: string) => void;
  removeItem: (listId: string, itemId: string) => Promise<void>;
}

function mapItem(i: any): ShoppingItem {
  return {
    id: i.id,
    name: i.name ?? i.title ?? '',
    quantity: i.quantity ?? 1,
    unit: i.unit ?? undefined,
    checked: i.checked ?? i.completed ?? false,
    category: i.category ?? undefined,
    addedBy: i.addedById ?? i.addedBy ?? '',
  };
}

function mapList(l: any): ShoppingList {
  return {
    id: l.id,
    name: l.name ?? l.title ?? '',
    items: (l.items ?? []).map(mapItem),
    shared: l.shared ?? true,
    createdBy: l.createdById ?? l.createdBy ?? '',
    updatedAt: l.updatedAt ?? l.createdAt ?? '',
  };
}

let _lastFetchedAt = 0;
const _ttlJitter = Math.random() * 10_000; // 0-10s jitter so stores don't all expire together

export const useListStore = create<ListState>()(
  persist(
    (set, get) => ({
  lists: [],
  isLoading: false,

  fetchLists: async (force?: boolean) => {
    const hasData = get().lists.length > 0;
    if (!force && hasData && Date.now() - _lastFetchedAt < 30_000 + _ttlJitter) return;
    set({ isLoading: !hasData });
    try {
      const hid = getResolvedHouseholdId();
      if (hid) {
        // User has a household — always use the household endpoint (includes nested items)
        const res = await apiGet<any>(`/households/${hid}/lists`);
        const raw = res.data ?? res;
        _lastFetchedAt = Date.now();
        set({ lists: (Array.isArray(raw) ? raw : []).map(mapList), isLoading: false });
      } else {
        // No household for this mode — show empty, never fall to /me/feed
        set({ lists: [], isLoading: false });
        _lastFetchedAt = Date.now();
      }
    } catch (err) {
      console.warn('[listStore] fetchLists failed:', err);
      set({ isLoading: false });
    }
  },

  addList: async (list) => {
    const currentUserId = useAuthStore.getState().user?.id ?? '';
    const tempId = `temp-${Date.now()}`;
    // Optimistic update first — always show the list immediately
    set((s) => ({
      lists: [...s.lists, {
        id: tempId,
        name: list.name,
        items: [],
        shared: list.shared ?? true,
        createdBy: list.createdBy || currentUserId,
        updatedAt: new Date().toISOString(),
      }],
    }));
    const hid = await ensureHouseholdId();
    if (!hid) return tempId; // No household — keep optimistic list, skip API
    try {
      const body: Record<string, unknown> = {
        name: list.name,
        shared: list.shared,
      };
      const res = await apiPost<any>(`/households/${hid}/lists`, body);
      const created = res?.data ?? res;
      if (created?.id) {
        set((s) => ({ lists: s.lists.map((l) => l.id === tempId ? mapList(created) : l) }));
        return created.id;
      }
    } catch (err) {
      console.warn('[listStore] addList failed:', err);
    }
    return tempId;
  },

  deleteList: async (id) => {
    const prev = get().lists;
    // Optimistic remove first
    set((s) => ({ lists: s.lists.filter((l) => l.id !== id) }));
    // If temp list (never persisted) or no household, nothing to delete on backend
    if (id.startsWith('temp-')) return;
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    try {
      await apiDelete(`/households/${hid}/lists/${id}`);
    } catch (err) {
      console.warn('[listStore] deleteList failed:', err);
      const original = prev.find((l) => l.id === id);
      if (original) {
        set((s) => ({ lists: s.lists.some((l) => l.id === id) ? s.lists : [original, ...s.lists] }));
      }
    }
  },

  addItem: async (listId, item) => {
    // Optimistic: show item immediately with temp ID regardless of household state
    const currentUserId = useAuthStore.getState().user?.id ?? '';
    const tempId = `temp-${Date.now()}`;
    const optimisticItem: ShoppingItem = { ...item, id: tempId, addedBy: item.addedBy || currentUserId };
    set((s) => ({
      lists: s.lists.map((l) =>
        l.id === listId ? { ...l, items: [...l.items, optimisticItem] } : l,
      ),
    }));
    const hid = getResolvedHouseholdId();
    // Skip API if no household or list is not yet persisted (temp list ID)
    if (!hid || listId.startsWith('temp-')) return;
    try {
      const body: Record<string, unknown> = {
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
      };
      const res = await apiPost<any>(`/households/${hid}/lists/${listId}/items`, body);
      const created = mapItem(res.data ?? res);
      // Replace temp ID with real ID, preserving any client-side checked state
      set((s) => ({
        lists: s.lists.map((l) =>
          l.id === listId
            ? { ...l, items: l.items.map((i) => i.id === tempId ? { ...created, checked: i.checked } : i) }
            : l,
        ),
      }));
    } catch (e) {
      console.warn('[listStore] addItem failed:', e);
      // Keep optimistic item for offline use
    }
  },

  updateItem: async (listId, itemId, updates) => {
    const hid = getResolvedHouseholdId();
    // Optimistic update
    set((s) => ({
      lists: s.lists.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.map((i) => i.id === itemId ? { ...i, ...updates } : i) }
          : l,
      ),
    }));
    if (!hid) return;
    try {
      await apiPatch(`/households/${hid}/lists/${listId}/items/${itemId}`, updates);
    } catch (err) {
      console.warn('[listStore] updateItem failed:', err);
    }
  },

  toggleItem: (listId, itemId) => {
    // Double-tap protection
    const list = get().lists.find((l) => l.id === listId);
    const item = list?.items.find((i) => i.id === itemId);
    if (!item || (item as any)._toggling) return;

    // Optimistic toggle FIRST — UI must respond immediately regardless of network state
    set((s) => ({
      lists: s.lists.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: l.items.map((i) =>
                i.id === itemId ? { ...i, checked: !i.checked, _toggling: true } as any : i,
              ),
            }
          : l,
      ),
    }));

    const clearToggling = () =>
      set((s) => ({
        lists: s.lists.map((l) =>
          l.id === listId
            ? { ...l, items: l.items.map((i) => i.id === itemId ? { ...i, _toggling: undefined } : i) }
            : l,
        ),
      }));

    // If item is not yet persisted (temp ID from optimistic addItem), keep the toggle locally
    if (itemId.startsWith('temp-')) { clearToggling(); return; }

    const hid = getResolvedHouseholdId();
    // If no household resolved, keep the optimistic toggle — it will sync on next fetch
    if (!hid) { clearToggling(); return; }

    apiPatch(`/households/${hid}/lists/${listId}/items/${itemId}/toggle`)
      .then(() => clearToggling())
      .catch(() => {
        // Rollback on API failure
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  items: l.items.map((i) =>
                    i.id === itemId ? { ...i, checked: !i.checked, _toggling: undefined } : i,
                  ),
                }
              : l,
          ),
        }));
      });
  },

  removeItem: async (listId, itemId) => {
    const prev = get().lists;
    // Optimistic remove first
    set((s) => ({
      lists: s.lists.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.filter((i) => i.id !== itemId) }
          : l,
      ),
    }));
    // Temp items were never persisted — nothing to delete on backend
    if (itemId.startsWith('temp-')) return;
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    try {
      await apiDelete(`/households/${hid}/lists/${listId}/items/${itemId}`);
    } catch (err) {
      console.warn('[listStore] removeItem failed:', err);
      const originalList = prev.find((l) => l.id === listId);
      const originalItem = originalList?.items.find((i) => i.id === itemId);
      if (originalItem) {
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === listId && !l.items.some((i) => i.id === itemId)
              ? { ...l, items: [...l.items, originalItem] }
              : l,
          ),
        }));
      }
    }
  },
    }),
    {
      name: 'sivena-lists',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ lists: state.lists }),
    },
  ),
);
