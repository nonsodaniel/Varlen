import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Memory } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from '../services/api';
import { useHouseholdStore, getResolvedHouseholdId } from './householdStore';
import { useCircleStore } from './circleStore';
import { useAuthStore } from './authStore';

interface MemoryState {
  memories: Memory[];
  isLoading: boolean;
  fetchMemories: () => Promise<void>;
  addMemory: (memory: Omit<Memory, 'id'>, imageUri?: string) => Promise<void>;
  updateMemory: (id: string, updates: Partial<Memory>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
}

function mapMemory(m: any): Memory {
  return {
    id: m.id,
    title: m.title ?? '',
    description: m.description ?? undefined,
    date: m.date ?? m.createdAt ?? '',
    type: (m.type ?? 'note').toLowerCase() as Memory['type'],
    createdBy: m.createdById ?? m.createdBy ?? '',
    shared: m.shared ?? true,
    emoji: m.emoji ?? undefined,
    imageUrl: m.imageUrl ?? m.image ?? undefined,
  };
}

let _lastFetchedAt = 0;

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
  memories: [],
  isLoading: false,

  fetchMemories: async () => {
    const hasData = get().memories.length > 0;
    if (hasData && Date.now() - _lastFetchedAt < 30000) return;
    set({ isLoading: !hasData });
    try {
      const { activeCircleId } = useCircleStore.getState();
      if (activeCircleId === null) {
        const res = await apiGet<{ data: { items: any[] } }>('/me/feed?type=memory');
        const items = res.data?.items ?? (res as any).items ?? [];
        set({ memories: items.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description ?? undefined,
          date: item.date ?? '',
          type: (item.metadata?.type ?? 'note').toLowerCase() as Memory['type'],
          createdBy: item.createdById ?? '',
          shared: true,
          emoji: item.metadata?.emoji ?? undefined,
          imageUrl: item.imageUrl ?? item.image ?? item.metadata?.imageUrl ?? undefined,
        })), isLoading: false });
        _lastFetchedAt = Date.now();
      } else {
        const hid = getResolvedHouseholdId();
        if (!hid) { set({ isLoading: false }); return; }
        const res = await apiGet<any>(`/households/${hid}/memories`);
        const raw = res.data ?? res;
        const arr = Array.isArray(raw) ? raw : [];
        _lastFetchedAt = Date.now();
        set({ memories: arr.map(mapMemory), isLoading: false });
      }
    } catch (err) {
      console.warn('[memoryStore] fetchMemories failed:', err);
      set({ isLoading: false });
    }
  },

  addMemory: async (memory, imageUri) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const currentUserId = useAuthStore.getState().user?.id ?? '';
    const tempId = `temp-${Date.now()}`;
    set((s) => ({ memories: [{ ...memory, id: tempId, imageUrl: imageUri, createdBy: memory.createdBy || currentUserId }, ...s.memories] }));
    try {
      let res: { data: any };
      if (imageUri) {
        const formData = new FormData();
        formData.append('title', memory.title);
        if (memory.description) formData.append('description', memory.description);
        formData.append('date', memory.date);
        formData.append('type', memory.type.toUpperCase());
        if (memory.emoji) formData.append('emoji', memory.emoji);
        formData.append('shared', String(memory.shared));
        const ext = imageUri.split('.').pop() ?? 'jpg';
        formData.append('image', {
          uri: imageUri,
          name: `memory-${Date.now()}.${ext}`,
          type: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
        } as any);
        res = await apiUpload<{ data: any }>(`/households/${hid}/memories`, formData);
      } else {
        const body: Record<string, unknown> = {
          title: memory.title,
          description: memory.description,
          date: memory.date,
          type: memory.type.toUpperCase(),
          emoji: memory.emoji,
          shared: memory.shared,
        };
        res = await apiPost<any>(`/households/${hid}/memories`, body);
      }
      const created = res?.data ?? res;
      if (created?.id) {
        set((s) => ({ memories: s.memories.map((m) => m.id === tempId ? mapMemory(created) : m) }));
      }
    } catch (err) {
      console.warn('[memoryStore] addMemory failed:', err);
    }
  },

  updateMemory: async (id, updates) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().memories;
    set((s) => ({
      memories: s.memories.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
    try {
      await apiPatch(`/households/${hid}/memories/${id}`, updates as Record<string, unknown>);
    } catch (err) {
      console.warn('[memoryStore] updateMemory failed:', err);
      set({ memories: prev });
    }
  },

  deleteMemory: async (id) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().memories;
    set((s) => ({ memories: s.memories.filter((m) => m.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/memories/${id}`);
    } catch (err) {
      console.warn('[memoryStore] deleteMemory failed:', err);
      set({ memories: prev });
    }
  },
    }),
    {
      name: 'sivena-memories',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ memories: state.memories }),
    },
  ),
);
