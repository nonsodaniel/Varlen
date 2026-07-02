import { create } from 'zustand';
import type { JournalEntry } from '../types';
import { format, subDays } from 'date-fns';

const today = new Date();

const mockJournalEntries: JournalEntry[] = [
  {
    id: 'journal-1',
    date: format(today, 'yyyy-MM-dd'),
    mood: 4,
    gratitude: 'Grateful for a beautiful morning walk with Jordan and Luna',
    note: 'Had a really productive day. Finished the big project at work and celebrated with takeout.',
    createdBy: 'user-1',
  },
  {
    id: 'journal-2',
    date: format(subDays(today, 1), 'yyyy-MM-dd'),
    mood: 3,
    gratitude: 'Thankful for a cozy evening at home',
    note: 'Work was stressful but date night made up for it. Tried the new Thai place downtown.',
    createdBy: 'user-1',
  },
  {
    id: 'journal-3',
    date: format(subDays(today, 2), 'yyyy-MM-dd'),
    mood: 5,
    gratitude: 'So happy about the best sleep in weeks!',
    note: 'Woke up feeling amazing. Got a long run in and meal prepped for the week.',
    createdBy: 'user-1',
  },
  {
    id: 'journal-4',
    date: format(subDays(today, 4), 'yyyy-MM-dd'),
    mood: 2,
    gratitude: 'At least the coffee was good',
    note: 'Rough night with Liam. Barely slept. Need to remember these hard days pass.',
    createdBy: 'user-1',
  },
  {
    id: 'journal-5',
    date: format(subDays(today, 6), 'yyyy-MM-dd'),
    mood: 5,
    gratitude: 'Family time is everything',
    note: 'Lazy Sunday with everyone home. Board games, pancakes, and no plans.',
    createdBy: 'user-1',
  },
];

interface JournalState {
  entries: JournalEntry[];
  addEntry: (entry: JournalEntry) => void;
}

export const useJournalStore = create<JournalState>((set) => ({
  entries: mockJournalEntries,

  addEntry: (entry) =>
    set((state) => ({ entries: [entry, ...state.entries] })),
}));
