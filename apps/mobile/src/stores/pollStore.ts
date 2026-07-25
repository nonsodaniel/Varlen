import { create } from 'zustand';
import type { Poll } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { getResolvedHouseholdId, ensureHouseholdId } from './householdStore';
import { useCircleStore } from './circleStore';
import { useAuthStore } from './authStore';

interface PollState {
  polls: Poll[];
  isLoading: boolean;
  fetchPolls: () => Promise<void>;
  addPoll: (poll: Omit<Poll, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  vote: (pollId: string, optionId: string, userId: string) => void;
  closePoll: (pollId: string) => Promise<void>;
  deletePoll: (pollId: string) => Promise<void>;
}

function mapPoll(p: any, existingMode?: Poll['mode']): Poll {
  return {
    id: p.id,
    question: p.question ?? p.title ?? '',
    options: (p.options ?? []).map((o: any) => ({
      id: o.id,
      label: o.label ?? o.text ?? '',
      emoji: o.emoji || undefined,
      votes: o.votes ?? o.voterIds ?? [],
    })),
    createdBy: p.createdById ?? p.createdBy ?? '',
    createdAt: p.createdAt ?? '',
    closesAt: p.closesAt ?? undefined,
    status: (p.status ?? 'active').toLowerCase() as Poll['status'],
    mode: (p.mode ?? existingMode ?? 'couple') as Poll['mode'],
  };
}

let _lastFetchedAt = 0;

export const usePollStore = create<PollState>((set, get) => ({
  polls: [],
  isLoading: false,

  fetchPolls: async () => {
    const hasData = get().polls.length > 0;
    if (hasData && Date.now() - _lastFetchedAt < 30000) return;
    set({ isLoading: !hasData });
    try {
      const { activeCircleId } = useCircleStore.getState();
      if (activeCircleId === null) {
        const res = await apiGet<{ data: { items: any[] } }>('/me/feed?type=poll');
        const items = res.data?.items ?? (res as any).items ?? [];
        set({ polls: items.map((item: any) => ({
          id: item.id,
          question: item.title,
          options: (item.metadata?.options ?? []).map((o: any) => ({
            id: o.id,
            label: o.label ?? o.text ?? '',
            emoji: o.emoji || undefined,
            votes: o.votes ?? o.voterIds ?? [],
          })),
          createdBy: item.createdById ?? '',
          createdAt: item.date ?? '',
          closesAt: item.metadata?.closesAt ?? undefined,
          status: (item.metadata?.status ?? 'active').toLowerCase() as Poll['status'],
        })), isLoading: false });
        _lastFetchedAt = Date.now();
      } else {
        const hid = getResolvedHouseholdId();
        if (!hid) { set({ isLoading: false }); return; }
        const res = await apiGet<any>(`/households/${hid}/polls`);
        const raw = res.data ?? res;
        const arr = Array.isArray(raw) ? raw : [];
        _lastFetchedAt = Date.now();
        const localModeMap = Object.fromEntries(
          get().polls.filter((p) => p.mode).map((p) => [p.id, p.mode])
        );
        set({ polls: arr.map((p: any) => mapPoll(p, localModeMap[p.id])), isLoading: false });
      }
    } catch (err) {
      console.warn('[pollStore] fetchPolls failed:', err);
      set({ isLoading: false });
    }
  },

  addPoll: async (poll) => {
    const hid = await ensureHouseholdId();
    if (!hid) return;
    const currentUserId = useAuthStore.getState().user?.id ?? '';
    const tempId = `temp-${Date.now()}`;
    const optimistic = { ...poll, id: tempId, createdAt: new Date().toISOString(), status: 'active' as const, createdBy: poll.createdBy || currentUserId };
    set((s) => ({ polls: [optimistic, ...s.polls] }));
    try {
      const body: Record<string, unknown> = {
        question: poll.question,
        options: poll.options.map((o) => ({ label: o.label, ...(o.emoji ? { emoji: o.emoji } : {}) })),
        closesAt: poll.closesAt,
        mode: poll.mode,
      };
      const res = await apiPost<any>(`/households/${hid}/polls`, body);
      const created = res?.data ?? res;
      if (created?.id) {
        set((s) => ({ polls: s.polls.map((p) => p.id === tempId ? mapPoll(created) : p) }));
      }
    } catch (err) {
      console.warn('[pollStore] addPoll failed:', err);
    }
  },

  vote: (pollId, optionId, userId) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().polls;
    set((s) => ({
      polls: s.polls.map((p) =>
        p.id === pollId
          ? {
              ...p,
              options: p.options.map((o) =>
                o.id === optionId
                  ? { ...o, votes: o.votes.includes(userId) ? o.votes : [...o.votes, userId] }
                  : { ...o, votes: o.votes.filter((v) => v !== userId) },
              ),
            }
          : p,
      ),
    }));
    apiPost(`/households/${hid}/polls/${pollId}/vote`, { optionId }).catch(() => {
      set({ polls: prev });
    });
  },

  closePoll: async (pollId) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    try {
      await apiPatch(`/households/${hid}/polls/${pollId}/close`);
      set((s) => ({
        polls: s.polls.map((p) =>
          p.id === pollId ? { ...p, status: 'closed' as const } : p,
        ),
      }));
    } catch (err) { console.warn('[pollStore] operation failed:', err); }
  },

  deletePoll: async (pollId) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().polls;
    set((s) => ({ polls: s.polls.filter((p) => p.id !== pollId) }));
    try {
      await apiDelete(`/households/${hid}/polls/${pollId}`);
    } catch (err) {
      console.warn('[pollStore] deletePoll failed:', err);
      set({ polls: prev });
    }
  },
}));
