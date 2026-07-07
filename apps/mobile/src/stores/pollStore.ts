import { create } from 'zustand';
import type { Poll } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { useHouseholdStore } from './householdStore';
import { useCircleStore } from './circleStore';

interface PollState {
  polls: Poll[];
  isLoading: boolean;
  fetchPolls: () => Promise<void>;
  addPoll: (poll: Omit<Poll, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  vote: (pollId: string, optionId: string, userId: string) => void;
  closePoll: (pollId: string) => Promise<void>;
  deletePoll: (pollId: string) => Promise<void>;
}

function mapPoll(p: any): Poll {
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
  };
}

export const usePollStore = create<PollState>((set, get) => ({
  polls: [],
  isLoading: false,

  fetchPolls: async () => {
    set({ isLoading: true });
    try {
      const { activeCircleId } = useCircleStore.getState();
      if (activeCircleId === null) {
        const res = await apiGet<{ data: { items: any[] } }>('/me/feed?type=poll');
        const items = res.data?.items ?? (res as any).items ?? [];
        set({ polls: items.map((item: any) => ({
          id: item.id,
          question: item.title,
          options: [],
          createdBy: item.createdById ?? '',
          createdAt: item.date ?? '',
          closesAt: undefined,
          status: (item.metadata?.status ?? 'active').toLowerCase() as Poll['status'],
        })), isLoading: false });
      } else {
        const hid = useHouseholdStore.getState().householdId;
        if (!hid) { set({ isLoading: false }); return; }
        const res = await apiGet<{ data: any[] }>(`/households/${hid}/polls`);
        set({ polls: (res.data ?? []).map(mapPoll), isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  addPoll: async (poll) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    try {
      const body: Record<string, unknown> = {
        question: poll.question,
        options: poll.options.map((o) => ({ label: o.label, ...(o.emoji ? { emoji: o.emoji } : {}) })),
        closesAt: poll.closesAt,
      };
      const res = await apiPost<{ data: any }>(`/households/${hid}/polls`, body);
      const newPoll = res?.data
        ? mapPoll(res.data)
        : { ...poll, id: `temp-${Date.now()}`, createdAt: new Date().toISOString(), status: 'active' as const };
      set((s) => ({ polls: [newPoll, ...s.polls] }));
    } catch {
      set((s) => ({
        polls: [{ ...poll, id: `temp-${Date.now()}`, createdAt: new Date().toISOString(), status: 'active' as const }, ...s.polls],
      }));
    }
  },

  vote: (pollId, optionId, userId) => {
    const hid = useHouseholdStore.getState().householdId;
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
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    try {
      await apiPatch(`/households/${hid}/polls/${pollId}/close`);
      set((s) => ({
        polls: s.polls.map((p) =>
          p.id === pollId ? { ...p, status: 'closed' as const } : p,
        ),
      }));
    } catch {}
  },

  deletePoll: async (pollId) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    const prev = get().polls;
    set((s) => ({ polls: s.polls.filter((p) => p.id !== pollId) }));
    try {
      await apiDelete(`/households/${hid}/polls/${pollId}`);
    } catch {
      set({ polls: prev });
    }
  },
}));
