import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalendarEvent } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { useHouseholdStore, getResolvedHouseholdId } from './householdStore';
import { useCircleStore } from './circleStore';
import { useAuthStore } from './authStore';

interface CalendarState {
  events: CalendarEvent[];
  selectedDate: string;
  isLoading: boolean;
  fetchEvents: () => Promise<void>;
  setSelectedDate: (date: string) => void;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsForDate: (date: string) => CalendarEvent[];
}

function mapEvent(e: any): CalendarEvent {
  return {
    id: e.id,
    title: e.title,
    description: e.description ?? undefined,
    startDate: e.startDate ?? e.start,
    endDate: e.endDate ?? e.end,
    allDay: e.allDay ?? false,
    color: e.color ?? '#3B82F6',
    location: e.location ?? undefined,
    createdBy: e.createdById ?? e.createdBy ?? '',
    shared: e.shared ?? true,
    recurring: e.recurring ? (e.recurring as string).toLowerCase() as CalendarEvent['recurring'] : undefined,
  };
}

function mapFeedEvent(item: any): CalendarEvent {
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? undefined,
    startDate: item.metadata?.startDate ?? item.date,
    endDate: item.metadata?.endDate ?? item.date,
    allDay: item.metadata?.allDay ?? false,
    color: item.metadata?.color ?? item.circleColor ?? '#3B82F6',
    location: item.metadata?.location ?? undefined,
    createdBy: item.createdById ?? '',
    shared: true,
    recurring: undefined,
  };
}

let _lastFetchedAt = 0;

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
  events: [],
  selectedDate: new Date().toISOString().split('T')[0],
  isLoading: false,

  fetchEvents: async () => {
    const hasData = get().events.length > 0;
    if (hasData && Date.now() - _lastFetchedAt < 30000) return;
    set({ isLoading: !hasData });
    try {
      const { activeCircleId } = useCircleStore.getState();
      if (activeCircleId === null) {
        const res = await apiGet<{ data: { items: any[] } }>('/me/feed?type=event');
        const items = res.data?.items ?? (res as any).items ?? [];
        _lastFetchedAt = Date.now();
        set({ events: items.map(mapFeedEvent), isLoading: false });
      } else {
        const hid = getResolvedHouseholdId();
        if (!hid) { set({ isLoading: false }); return; }
        const res = await apiGet<any>(`/households/${hid}/events`);
        const raw = res.data ?? res;
        const arr = Array.isArray(raw) ? raw : [];
        _lastFetchedAt = Date.now();
        set({ events: arr.map(mapEvent), isLoading: false });
      }
    } catch (err) {
      console.warn('[calendarStore] fetchEvents failed:', err);
      set({ isLoading: false });
    }
  },

  setSelectedDate: (date) => set({ selectedDate: date }),

  addEvent: async (event) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const currentUserId = useAuthStore.getState().user?.id ?? '';
    const tempId = `temp-${Date.now()}`;
    set((s) => ({ events: [...s.events, { ...event, id: tempId, createdBy: event.createdBy || currentUserId }] }));
    try {
      const body: Record<string, unknown> = {
        title: event.title,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        allDay: event.allDay,
        color: event.color,
        location: event.location,
        shared: event.shared,
        recurring: event.recurring ? event.recurring.toUpperCase() : undefined,
      };
      const res = await apiPost<any>(`/households/${hid}/events`, body);
      const created = res?.data ?? res;
      if (created?.id) {
        set((s) => ({ events: s.events.map((e) => e.id === tempId ? mapEvent(created) : e) }));
      }
    } catch (err) {
      console.warn('[calendarStore] addEvent failed:', err);
    }
  },

  updateEvent: async (id, updates) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().events;
    set((s) => ({
      events: s.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
    try {
      await apiPatch(`/households/${hid}/events/${id}`, updates as Record<string, unknown>);
    } catch (err) {
      console.warn('[calendarStore] updateEvent failed:', err);
      set({ events: prev });
    }
  },

  deleteEvent: async (id) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().events;
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/events/${id}`);
    } catch (err) {
      console.warn('[calendarStore] deleteEvent failed:', err);
      set({ events: prev });
    }
  },

  getEventsForDate: (date) => {
    return get().events.filter((e) => e.startDate.startsWith(date));
  },
    }),
    {
      name: 'sivena-calendar',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ events: state.events, selectedDate: state.selectedDate }),
    },
  ),
);
