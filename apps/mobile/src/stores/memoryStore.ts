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
    if (hasData && Date.now() - _lastFetchedAt < 30000) return;
    set({ isLoading: !hasData });
    try {
      const hid = getResolvedHouseholdId();

      if (!hid) {
        // No household resolved — show empty rather than /me/feed (which exposes all modes' memories)
        set({ memories: [], isLoading: false });
        return;
      }

      const res = await apiGet<any>(`/households/${hid}/memories`);
      const raw = res.data ?? res;
      const arr = Array.isArray(raw) ? raw : [];
      // Preserve locally-assigned mode tags and visibleModes (server may not return these fields)
      const localModeMap = Object.fromEntries(
        get().memories.filter((m) => m.mode).map((m) => [m.id, m.mode])
      );
      const localVisibleModesMap = Object.fromEntries(
        get().memories.filter((m) => m.visibleModes).map((m) => [m.id, m.visibleModes])
      );
      _lastFetchedAt = Date.now();
      // Build maps of local image references to preserve if the server list
      // doesn't return imageUrl (e.g. list endpoint omits the field).
      const localUriMap = Object.fromEntries(
        get().memories
          .filter((m) => m._localImageUri || m._localImageUris)
          .map((m) => [m.id, { _localImageUri: m._localImageUri, _localImageUris: m._localImageUris }])
      );
      // Also preserve real CDN URLs that we assigned after upload (these survive persist)
      const localCdnMap = Object.fromEntries(
        get().memories
          .filter((m) => m.imageUrl && !m.id.startsWith('temp-'))
          .map((m) => [m.id, { imageUrl: m.imageUrl, imageUrls: m.imageUrls }])
      );
      const serverMemories = arr.map((m: any) => {
        const mapped = mapMemory(m, localModeMap[m.id]);
        // Restore locally stored visibleModes (sharing to other modes — client-side only)
        if (localVisibleModesMap[m.id]) mapped.visibleModes = localVisibleModesMap[m.id];
        // Tag with source household ID so delete/update always hit the right endpoint
        (mapped as any)._hid = hid;
        // If server list omits imageUrl, restore the CDN URL we stored locally from upload
        if (!mapped.imageUrl && localCdnMap[mapped.id]) {
          mapped.imageUrl = localCdnMap[mapped.id].imageUrl;
          if (!mapped.imageUrls?.length) mapped.imageUrls = localCdnMap[mapped.id].imageUrls;
        }
        // Fallback: restore transient local file URI (session-only, stripped on persist)
        if (!mapped.imageUrl && localUriMap[mapped.id]) {
          mapped._localImageUri = localUriMap[mapped.id]._localImageUri;
          mapped._localImageUris = localUriMap[mapped.id]._localImageUris;
        }
        return mapped;
      });
      // Preserve any in-flight optimistic entries (temp-xxx) so they aren't wiped
      // by a fetch that returned before the server confirmed the new memory.
      const tempItems = get().memories.filter((m) => m.id.startsWith('temp-'));
      set({ memories: [...serverMemories, ...tempItems], isLoading: false });
    } catch (err) {
      console.warn('[memoryStore] fetchMemories failed:', err);
      set({ isLoading: false });
    }
  },

  addMemory: async (memory, imageUris) => {
    const currentUserId = useAuthStore.getState().user?.id ?? '';
    const tempId = `temp-${Date.now()}`;
    const firstUri = imageUris?.[0];
    // Optimistic update BEFORE any await — ensures temp entry exists in store
    // before navigation triggers fetchMemories on the destination tab.
    set((s) => ({ memories: [{ ...memory, id: tempId, imageUrl: undefined, _localImageUri: firstUri, _localImageUris: imageUris, createdBy: memory.createdBy || currentUserId }, ...s.memories] }));
    const hid = await ensureHouseholdId();
    if (!hid) {
      set((s) => ({ memories: s.memories.filter((m) => m.id !== tempId) }));
      return;
    }
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
        // mode and imageUrls are client-side only — server rejects these fields (400)
        ...(imageUrl && { imageUrl }),
      };
      const res = await apiPost<any>(`/households/${hid}/memories`, body);
      const created = res?.data ?? res;
      if (created?.id) {
        const confirmed = mapMemory(created, memory.mode);
        // If CREATE response didn't echo back image URLs, assign the CDN URLs we already
        // have from the upload step — they are permanent and survive app restarts.
        // _localImageUri would be stripped by partialize on persist, so use real URLs.
        if (!confirmed.imageUrl && uploadedUrls.length > 0) confirmed.imageUrl = uploadedUrls[0];
        if (!confirmed.imageUrls?.length && uploadedUrls.length > 0) confirmed.imageUrls = uploadedUrls;
        // Last-resort: only use local file URI if upload itself failed (no CDN URLs)
        if (!confirmed.imageUrl && firstUri) confirmed._localImageUri = firstUri;
        // Tag with hid so subsequent delete/update use the right household endpoint
        (confirmed as any)._hid = hid;
        set((s) => ({ memories: s.memories.map((m) => m.id === tempId ? confirmed : m) }));
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
    const memory = get().memories.find((m) => m.id === id);
    const hid = (memory as any)?._hid ?? getResolvedHouseholdId();
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
    const memory = get().memories.find((m) => m.id === id);
    const hid = (memory as any)?._hid ?? getResolvedHouseholdId();
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
      // Strip transient local file URIs before persisting; keep visibleModes and other fields
      partialize: (state) => ({
        memories: state.memories.map(({ _localImageUri, _localImageUris, ...m }) => m),
      }),
    },
  ),
);
