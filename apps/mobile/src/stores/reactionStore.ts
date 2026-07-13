import { create } from 'zustand';
import type { Reaction } from '../types';
import { apiGet, apiPost, apiDelete } from '../services/api';
import { getResolvedHouseholdId } from './householdStore';

interface ReactionState {
  reactions: Record<string, Reaction[]>; // keyed by "entityType:entityId"
  fetchReactions: (entityType: string, entityId: string) => Promise<void>;
  addReaction: (entityType: string, entityId: string, emoji: string) => Promise<void>;
  removeReaction: (reactionId: string, entityType: string, entityId: string) => Promise<void>;
  handleSocketNew: (reaction: Reaction) => void;
  handleSocketRemoved: (data: { id: string; entityType: string; entityId: string }) => void;
}

function makeKey(entityType: string, entityId: string) {
  return `${entityType}:${entityId}`;
}

export const useReactionStore = create<ReactionState>((set, get) => ({
  reactions: {},

  fetchReactions: async (entityType, entityId) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    try {
      const res = await apiGet<any>(
        `/households/${hid}/reactions?entityType=${entityType}&entityId=${entityId}`,
      );
      const raw = res.data ?? res;
      const arr: Reaction[] = (Array.isArray(raw) ? raw : []).map((r: any) => ({
        id: r.id,
        userId: r.userId,
        emoji: r.emoji,
        entityType: r.entityType,
        entityId: r.entityId,
        createdAt: r.createdAt,
      }));
      const key = makeKey(entityType, entityId);
      set((state) => ({
        reactions: { ...state.reactions, [key]: arr },
      }));
    } catch (err) { console.warn('[reactionStore] operation failed:', err); }
  },

  addReaction: async (entityType, entityId, emoji) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;

    // Optimistic update
    const key = makeKey(entityType, entityId);
    const tempId = `temp-${Date.now()}`;
    const tempReaction: Reaction = {
      id: tempId,
      userId: '',
      emoji,
      entityType,
      entityId,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      reactions: {
        ...state.reactions,
        [key]: [...(state.reactions[key] || []), tempReaction],
      },
    }));

    try {
      const res = await apiPost<any>(`/households/${hid}/reactions`, {
        emoji,
        entityType,
        entityId,
      });
      const reaction = res.data ?? res;
      // Replace temp with real
      set((state) => ({
        reactions: {
          ...state.reactions,
          [key]: (state.reactions[key] || []).map((r) =>
            r.id === tempId
              ? {
                  id: reaction.id,
                  userId: reaction.userId,
                  emoji: reaction.emoji,
                  entityType: reaction.entityType,
                  entityId: reaction.entityId,
                  createdAt: reaction.createdAt,
                }
              : r,
          ),
        },
      }));
    } catch (err) {
      console.warn('[reactionStore] addReaction failed:', err);
      // Rollback
      set((state) => ({
        reactions: {
          ...state.reactions,
          [key]: (state.reactions[key] || []).filter((r) => r.id !== tempId),
        },
      }));
    }
  },

  removeReaction: async (reactionId, entityType, entityId) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;

    const key = makeKey(entityType, entityId);
    const prev = get().reactions[key] || [];

    // Optimistic removal
    set((state) => ({
      reactions: {
        ...state.reactions,
        [key]: (state.reactions[key] || []).filter((r) => r.id !== reactionId),
      },
    }));

    try {
      await apiDelete(`/households/${hid}/reactions/${reactionId}`);
    } catch (err) {
      console.warn('[reactionStore] removeReaction failed:', err);
      // Rollback
      set((state) => ({
        reactions: { ...state.reactions, [key]: prev },
      }));
    }
  },

  handleSocketNew: (reaction) => {
    const key = makeKey(reaction.entityType, reaction.entityId);
    set((state) => {
      const existing = state.reactions[key] || [];
      if (existing.some((r) => r.id === reaction.id)) return state;
      return {
        reactions: { ...state.reactions, [key]: [...existing, reaction] },
      };
    });
  },

  handleSocketRemoved: (data) => {
    const key = makeKey(data.entityType, data.entityId);
    set((state) => ({
      reactions: {
        ...state.reactions,
        [key]: (state.reactions[key] || []).filter((r) => r.id !== data.id),
      },
    }));
  },
}));
