import { create } from 'zustand';
import { ShoppingList, ShoppingItem } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { useHouseholdStore } from './householdStore';
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

export const useListStore = create<ListState>((set, get) => ({
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
      const hid = useHouseholdStore.getState().householdId;
      if (!hid) { set({ isLoading: false }); return; }
      const res = await apiGet<{ data: any[] }>(`/households/${hid}/lists`);
      set({ lists: (res.data ?? []).map(mapList), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addList: async (list) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    try {
      const body: Record<string, unknown> = {
        name: list.name,
        shared: list.shared,
      };
      const res = await apiPost<{ data: any }>(`/households/${hid}/lists`, body);
      set((s) => ({ lists: [...s.lists, mapList(res.data)] }));
    } catch {}
  },

  deleteList: async (id) => {
    const hid = useHouseholdStore.getState().householdId;
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
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    try {
      const body: Record<string, unknown> = {
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
      };
      const res = await apiPost<{ data: any }>(`/households/${hid}/lists/${listId}/items`, body);
      set((s) => ({
        lists: s.lists.map((l) =>
          l.id === listId ? { ...l, items: [...l.items, mapItem(res.data)] } : l,
        ),
      }));
    } catch {}
  },

  toggleItem: (listId, itemId) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    set((s) => ({
      lists: s.lists.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: l.items.map((i) =>
                i.id === itemId ? { ...i, checked: !i.checked } : i,
              ),
            }
          : l,
      ),
    }));
    apiPatch(`/households/${hid}/lists/${listId}/items/${itemId}/toggle`).catch(() => {
      set((s) => ({
        lists: s.lists.map((l) =>
          l.id === listId
            ? {
                ...l,
                items: l.items.map((i) =>
                  i.id === itemId ? { ...i, checked: !i.checked } : i,
                ),
              }
            : l,
        ),
      }));
    });
  },

  removeItem: async (listId, itemId) => {
    const hid = useHouseholdStore.getState().householdId;
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
}));
