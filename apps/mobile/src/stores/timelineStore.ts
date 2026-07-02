import { create } from 'zustand';
import type { TimelineEntry } from '../types';
import { mockTimeline } from '../data/mock';

interface TimelineState {
  entries: TimelineEntry[];
  addEntry: (entry: TimelineEntry) => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  entries: mockTimeline,
  addEntry: (entry) => set((state) => ({ entries: [entry, ...state.entries] })),
}));
