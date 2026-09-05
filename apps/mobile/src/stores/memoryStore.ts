import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Memory } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from '../services/api';
import { maybeRequestReview } from '../lib/reviewPrompt';
import { useHouseholdStore, getResolvedHouseholdId, ensureHouseholdId } from './householdStore';
import { useCircleStore } from './circleStore';
import { useAuthStore } from './authStore';
import * as ImageManipulator from 'expo-image-manipulator';

interface MemoryState {
  memories: Memory[];
  isLoading: boolean;
  fetchMemories: () => Promise<void>;
  addMemory: (memory: Omit<Memory, 'id'>, imageUris?: string[]) => Promise<void>;
  updateMemory: (id: string, updates: Partial<Memory>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
}

async function compressImage(uri: string): Promise<string | null> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1280 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
    );
    return result.uri;
  } catch {
    // If compression fails entirely (e.g. unsupported source format), skip this image
    // rather than sending the original — server rejects HEIC/other unsupported types
    return null;
  }
}

function mapMemory(m: any, existingMode?: Memory['mode']): Memory {
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
    imageUrls: m.imageUrls ?? undefined,
    // Prefer server-returned mode, then locally preserved mode. No default — undefined means show in all modes.
    mode: (m.mode ?? existingMode ?? undefined) as Memory['mode'] | undefined,
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
    if (hasData && Date.now() - _lastFetchedAt < 300000) return;
    set({ isLoading: !hasData });
    try {
      // Prefer the household endpoint (returns full memory objects including imageUrl).
      // Fall back to the personal feed only when no household is resolved.
      const hid = getResolvedHouseholdId();
      if (hid) {
        const res = await apiGet<any>(`/households/${hid}/memories`);
        const raw = res.data ?? res;
        const arr = Array.isArray(raw) ? raw : [];
        // Preserve locally-assigned mode tags (server may not return this field)
        const localModeMap = Object.fromEntries(
          get().memories.filter((m) => m.mode).map((m) => [m.id, m.mode])
        );
        _lastFetchedAt = Date.now();
        set({ memories: arr.map((m: any) => mapMemory(m, localModeMap[m.id])), isLoading: false });
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

  addMemory: async (memory, imageUris) => {
    const hid = await ensureHouseholdId();
    if (!hid) return;
    const currentUserId = useAuthStore.getState().user?.id ?? '';
    const tempId = `temp-${Date.now()}`;
    const firstUri = imageUris?.[0];
    // Optimistic update — store local file URIs so images show immediately
    set((s) => ({ memories: [{ ...memory, id: tempId, imageUrl: undefined, _localImageUri: firstUri, _localImageUris: imageUris, createdBy: memory.createdBy || currentUserId }, ...s.memories] }));
    try {
      // Compress and upload all images — failure is non-fatal per image
      const uploadedUrls: string[] = [];
      if (imageUris?.length) {
        for (const uri of imageUris) {
          try {
            const compressed = await compressImage(uri);
            if (!compressed) continue; // skip if compression failed (unsupported format)
            const formData = new FormData();
            formData.append('file', {
              uri: compressed,
              name: `memory-photo-${Date.now()}-${uploadedUrls.length}.jpg`,
              type: 'image/jpeg',
            } as any);
            const uploaded = await apiUpload<{ url: string }>('/upload', formData);
            const url = (uploaded as any)?.url ?? (uploaded as any)?.data?.url;
            if (url) uploadedUrls.push(url);
          } catch (uploadErr) {
            console.warn('[memoryStore] image upload failed:', uploadErr);
          }
        }
      }
      const imageUrl = uploadedUrls[0];
      const body: Record<string, unknown> = {
        title: memory.title,
        description: memory.description,
        date: memory.date,
        type: memory.type.toUpperCase(),
        emoji: memory.emoji,
        shared: memory.shared,
        mode: memory.mode,
        ...(imageUrl && { imageUrl }),
        ...(uploadedUrls.length > 0 && { imageUrls: uploadedUrls }),
      };
      const res = await apiPost<any>(`/households/${hid}/memories`, body);
      const created = res?.data ?? res;
      if (created?.id) {
        set((s) => ({ memories: s.memories.map((m) => m.id === tempId ? mapMemory(created, memory.mode) : m) }));
        // Force immediate re-fetch from backend to display the actual server imageUrl
        _lastFetchedAt = 0;
        get().fetchMemories();
        maybeRequestReview('memory');
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
      // Strip transient local file URIs before persisting to AsyncStorage
      partialize: (state) => ({
        memories: state.memories.map(({ _localImageUri, _localImageUris, ...m }) => m),
      }),
    },
  ),
);
