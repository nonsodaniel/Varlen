import { create } from 'zustand';
import { Memory } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from '../services/api';
import { useHouseholdStore } from './householdStore';
import { useCircleStore } from './circleStore';

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

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],
  isLoading: false,

  fetchMemories: async () => {
    set({ isLoading: true });
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
      } else {
        const hid = useHouseholdStore.getState().householdId;
        if (!hid) { set({ isLoading: false }); return; }
        const res = await apiGet<any>(`/households/${hid}/memories`);
        const raw = res.data ?? res;
        const arr = Array.isArray(raw) ? raw : [];
        set({ memories: arr.map(mapMemory), isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  addMemory: async (memory, imageUri) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    try {
      let res: { data: any };
      if (imageUri) {
        const formData = new FormData();
        formData.append('title', memory.title);
        if (memory.description) formData.append('description', memory.description);
        formData.append('date', memory.date);
        formData.append('type', memory.type.toUpperCase());
        if (memory.emoji) formData.append('emoji', memory.emoji);
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
        };
        res = await apiPost<any>(`/households/${hid}/memories`, body);
      }
      const created = res?.data ?? res;
      const newMemory = created?.id ? mapMemory(created) : { ...memory, id: `temp-${Date.now()}`, imageUrl: imageUri };
      set((s) => ({ memories: [newMemory, ...s.memories] }));
    } catch {
      set((s) => ({ memories: [{ ...memory, id: `temp-${Date.now()}`, imageUrl: imageUri }, ...s.memories] }));
    }
  },

  updateMemory: async (id, updates) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    const prev = get().memories;
    set((s) => ({
      memories: s.memories.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
    try {
      await apiPatch(`/households/${hid}/memories/${id}`, updates as Record<string, unknown>);
    } catch {
      set({ memories: prev });
    }
  },

  deleteMemory: async (id) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    const prev = get().memories;
    set((s) => ({ memories: s.memories.filter((m) => m.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/memories/${id}`);
    } catch {
      set({ memories: prev });
    }
  },
}));
