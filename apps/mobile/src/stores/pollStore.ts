import { create } from 'zustand';
import type { Poll } from '../types';
import { mockPolls } from '../data/mock';

interface PollState {
  polls: Poll[];
  addPoll: (poll: Poll) => void;
  vote: (pollId: string, optionId: string, userId: string) => void;
}

export const usePollStore = create<PollState>((set) => ({
  polls: mockPolls,
  addPoll: (poll) => set((state) => ({ polls: [poll, ...state.polls] })),
  vote: (pollId, optionId, userId) => set((state) => ({
    polls: state.polls.map((p) =>
      p.id === pollId
        ? {
            ...p,
            options: p.options.map((o) =>
              o.id === optionId
                ? { ...o, votes: o.votes.includes(userId) ? o.votes : [...o.votes, userId] }
                : { ...o, votes: o.votes.filter((v) => v !== userId) }
            ),
          }
        : p
    ),
  })),
}));
