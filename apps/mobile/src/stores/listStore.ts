import { create } from 'zustand';
import { ShoppingList, ShoppingItem } from '../types';
import { mockLists } from '../data/mock';

interface ListState {
  lists: ShoppingList[];
  addList: (list: ShoppingList) => void;
  deleteList: (id: string) => void;
  addItem: (listId: string, item: ShoppingItem) => void;
  toggleItem: (listId: string, itemId: string) => void;
  removeItem: (listId: string, itemId: string) => void;
}

export const useListStore = create<ListState>((set) => ({
  lists: mockLists,

  addList: (list) =>
    set((state) => ({ lists: [...state.lists, list] })),

  deleteList: (id) =>
    set((state) => ({ lists: state.lists.filter((l) => l.id !== id) })),

  addItem: (listId, item) =>
    set((state) => ({
      lists: state.lists.map((l) =>
        l.id === listId ? { ...l, items: [...l.items, item] } : l
      ),
    })),

  toggleItem: (listId, itemId) =>
    set((state) => ({
      lists: state.lists.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: l.items.map((i) =>
                i.id === itemId ? { ...i, checked: !i.checked } : i
              ),
            }
          : l
      ),
    })),

  removeItem: (listId, itemId) =>
    set((state) => ({
      lists: state.lists.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.filter((i) => i.id !== itemId) }
          : l
      ),
    })),
}));
