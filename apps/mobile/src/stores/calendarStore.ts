import { create } from 'zustand';
import { CalendarEvent } from '../types';
import { mockEvents } from '../data/mock';

interface CalendarState {
  events: CalendarEvent[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  getEventsForDate: (date: string) => CalendarEvent[];
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: mockEvents,
  selectedDate: new Date().toISOString().split('T')[0],

  setSelectedDate: (date) => set({ selectedDate: date }),

  addEvent: (event) =>
    set((state) => ({ events: [...state.events, event] })),

  updateEvent: (id, updates) =>
    set((state) => ({
      events: state.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),

  deleteEvent: (id) =>
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    })),

  getEventsForDate: (date) => {
    return get().events.filter((e) => e.startDate.startsWith(date));
  },
}));
