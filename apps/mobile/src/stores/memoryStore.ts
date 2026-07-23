import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Memory } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from '../services/api';
import { useHouseholdStore, getResolvedHouseholdId, ensureHouseholdId } from './householdStore';
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
    emoji: m.emoji ?? m.metadata?.emoji ?? undefined,
    imageUrl: m.imageUrl ?? m.image_url ?? m.photoUrl ?? m.photo_url ?? m.image ?? m.photo ?? m.metadata?.imageUrl ?? undefined,
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
    if (hasData && Date.now() - _lastFetchedAt < 10000) return;
    set({ isLoading: !hasData });
    try {
      // Prefer the household endpoint (returns full memory objects including imageUrl).
      // Fall back to the personal feed only when no household is resolved.
      const hid = getResolvedHouseholdId();
      if (hid) {
        const res = await apiGet<any>(`/households/${hid}/memories`);
        const raw = res.data ?? res;
        const arr = Array.isArray(raw) ? raw : [];
        _lastFetchedAt = Date.now();
        set({ memories: arr.map(mapMemory), isLoading: false });
      } else {
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
          imageUrl: item.imageUrl ?? item.image_url ?? item.photoUrl ?? item.photo_url ?? item.image ?? item.photo ?? item.metadata?.imageUrl ?? undefined,
        })), isLoading: false });
        _lastFetchedAt = Date.now();
      }
    } catch (err) {
      console.warn('[memoryStore] fetchMemories failed:', err);
      set({ isLoading: false });
    }
  },

  addMemory: async (memory, imageUri) => {
    const hid = await ensureHouseholdId();
    if (!hid) return;
    const currentUserId = useAuthStore.getState().user?.id ?? '';
    const tempId = `temp-${Date.now()}`;
    // Optimistic update — store local file URI in _localImageUri (not persisted) so image shows immediately
    set((s) => ({ memories: [{ ...memory, id: tempId, imageUrl: undefined, _localImageUri: imageUri, createdBy: memory.createdBy || currentUserId }, ...s.memories] }));
    try {
      // Attempt upload — failure here is non-fatal, memory is created without imageUrl
      let imageUrl: string | undefined;
      if (imageUri) {
        try {
          const cleanUri = imageUri.split('?')[0];
          const ext = cleanUri.split('.').pop()?.toLowerCase() ?? 'jpg';
          const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
          const formData = new FormData();
          formData.append('file', {
            uri: imageUri,
            name: `memory-${Date.now()}.${safeExt}`,
            type: `image/${safeExt === 'png' ? 'png' : safeExt === 'gif' ? 'gif' : safeExt === 'webp' ? 'webp' : 'jpeg'}`,
          } as any);
          const uploaded = await apiUpload<{ url: string }>('/upload', formData);
          imageUrl = (uploaded as any)?.url ?? (uploaded as any)?.data?.url;
        } catch (uploadErr) {
          console.warn('[memoryStore] image upload failed (memory will be created without image):', uploadErr);
        }
      }
      const body: Record<string, unknown> = {
        title: memory.title,
        description: memory.description,
        date: memory.date,
        type: memory.type.toUpperCase(),
        emoji: memory.emoji,
        shared: memory.shared,
        ...(imageUrl && { imageUrl }),
      };
      const res = await apiPost<any>(`/households/${hid}/memories`, body);
      const created = res?.data ?? res;
      if (created?.id) {
        set((s) => ({ memories: s.memories.map((m) => m.id === tempId ? mapMemory(created) : m) }));
        // Force immediate re-fetch from backend to display the actual server imageUrl
        _lastFetchedAt = 0;
        get().fetchMemories();
      }
    } catch (err) {
      console.warn('[memoryStore] addMemory failed:', err);
      // Remove temp memory since server creation failed
      set((s) => ({ memories: s.memories.filter((m) => m.id !== tempId) }));
      throw err;
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
      // Strip _localImageUri (transient local file path) before persisting to AsyncStorage
      partialize: (state) => ({
        memories: state.memories.map(({ _localImageUri, ...m }) => m),
      }),
    },
  ),
);
