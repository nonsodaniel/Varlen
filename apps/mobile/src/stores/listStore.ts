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
  fetchLists: () => Promise<void>;
  addList: (list: Omit<ShoppingList, 'id' | 'items' | 'updatedAt'> & { items?: ShoppingItem[] }) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  addItem: (listId: string, item: Omit<ShoppingItem, 'id'>) => Promise<void>;
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

export const useListStore = create<ListState>()(
  persist(
    (set, get) => ({
  lists: [],
  isLoading: false,

  fetchLists: async () => {
    const hasData = get().lists.length > 0;
    if (hasData && Date.now() - _lastFetchedAt < 30000) return;
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
    if (!hid) return; // No household — keep optimistic list, skip API
    try {
      const body: Record<string, unknown> = {
        name: list.name,
        shared: list.shared,
      };
      const res = await apiPost<any>(`/households/${hid}/lists`, body);
      const created = res?.data ?? res;
      if (created?.id) {
        set((s) => ({ lists: s.lists.map((l) => l.id === tempId ? mapList(created) : l) }));
      }
    } catch (err) {
      console.warn('[listStore] addList failed:', err);
    }
  },

  deleteList: async (id) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().lists;
    set((s) => ({ lists: s.lists.filter((l) => l.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/lists/${id}`);
    } catch (err) {
      console.warn('[listStore] deleteList failed:', err);
      set({ lists: prev });
    }
  },

  addItem: async (listId, item) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    // Optimistic: show item immediately with temp ID
    const currentUserId = useAuthStore.getState().user?.id ?? '';
    const tempId = `temp-${Date.now()}`;
    const optimisticItem: ShoppingItem = { ...item, id: tempId, addedBy: item.addedBy || currentUserId };
    set((s) => ({
      lists: s.lists.map((l) =>
        l.id === listId ? { ...l, items: [...l.items, optimisticItem] } : l,
      ),
    }));
    try {
      const body: Record<string, unknown> = {
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        addedBy: item.addedBy || currentUserId,
      };
      const res = await apiPost<any>(`/households/${hid}/lists/${listId}/items`, body);
      const created = mapItem(res.data ?? res);
      set((s) => ({
        lists: s.lists.map((l) =>
          l.id === listId
            ? { ...l, items: l.items.map((i) => i.id === tempId ? created : i) }
            : l,
        ),
      }));
    } catch (e) {
      console.warn('[listStore] addItem failed:', e);
      // Keep optimistic item for offline use
    }
  },

  toggleItem: (listId, itemId) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    // Double-tap protection
    const list = get().lists.find((l) => l.id === listId);
    const item = list?.items.find((i) => i.id === itemId);
    if (!item || (item as any)._toggling) return;
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
    apiPatch(`/households/${hid}/lists/${listId}/items/${itemId}/toggle`)
      .then(() => {
        // Clear toggling flag on success
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === listId
              ? { ...l, items: l.items.map((i) => i.id === itemId ? { ...i, _toggling: undefined } : i) }
              : l,
          ),
        }));
      })
      .catch(() => {
        // Rollback and clear flag on failure
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
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().lists;
    set((s) => ({
      lists: s.lists.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.filter((i) => i.id !== itemId) }
          : l,
      ),
    }));
    try {
      await apiDelete(`/households/${hid}/lists/${listId}/items/${itemId}`);
    } catch (err) {
      console.warn('[listStore] removeItem failed:', err);
      set({ lists: prev });
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
