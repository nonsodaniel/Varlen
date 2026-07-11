import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShoppingList, ShoppingItem } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { useHouseholdStore, getResolvedHouseholdId } from './householdStore';
import { useCircleStore } from './circleStore';

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

export const useListStore = create<ListState>()(
  persist(
    (set, get) => ({
  lists: [],
  isLoading: false,

  fetchLists: async () => {
    set({ isLoading: true });
    try {
      const { activeCircleId } = useCircleStore.getState();
      if (activeCircleId === null) {
        const res = await apiGet<{ data: { items: any[] } }>('/me/feed?type=list');
        const items = res.data?.items ?? (res as any).items ?? [];
        set({ lists: items.map((item: any) => ({
          id: item.id,
          name: item.title,
          items: [],
          shared: true,
          createdBy: item.createdById ?? '',
          updatedAt: item.date ?? '',
        })), isLoading: false });
        return;
      }
      const hid = getResolvedHouseholdId();
      if (!hid) { set({ isLoading: false }); return; }
      const res = await apiGet<any>(`/households/${hid}/lists`);
      const raw = res.data ?? res;
      set({ lists: (Array.isArray(raw) ? raw : []).map(mapList), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addList: async (list) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    try {
      const body: Record<string, unknown> = {
        name: list.name,
        shared: list.shared,
      };
      const res = await apiPost<any>(`/households/${hid}/lists`, body);
      set((s) => ({ lists: [...s.lists, mapList(res.data ?? res)] }));
    } catch (e) {
      // Offline fallback — add with temp ID so the UI stays responsive
      set((s) => ({
        lists: [...s.lists, {
          id: `temp-${Date.now()}`,
          name: list.name,
          items: [],
          shared: list.shared ?? true,
          createdBy: list.createdBy ?? '',
          updatedAt: new Date().toISOString(),
        }],
      }));
      throw e;
    }
  },

  deleteList: async (id) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().lists;
    set((s) => ({ lists: s.lists.filter((l) => l.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/lists/${id}`);
    } catch {
      set({ lists: prev });
    }
  },

  addItem: async (listId, item) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    try {
      const body: Record<string, unknown> = {
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
      };
      const res = await apiPost<any>(`/households/${hid}/lists/${listId}/items`, body);
      set((s) => ({
        lists: s.lists.map((l) =>
          l.id === listId ? { ...l, items: [...l.items, mapItem(res.data ?? res)] } : l,
        ),
      }));
    } catch (e) {
      // Offline fallback — add with temp ID
      set((s) => ({
        lists: s.lists.map((l) =>
          l.id === listId
            ? { ...l, items: [...l.items, { ...item, id: `temp-${Date.now()}` }] }
            : l,
        ),
      }));
      throw e;
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
    } catch {
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
