import { create } from 'zustand';
import { CalendarEvent } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { useHouseholdStore } from './householdStore';
import { useCircleStore } from './circleStore';

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

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  selectedDate: new Date().toISOString().split('T')[0],
  isLoading: false,

  fetchEvents: async () => {
    set({ isLoading: true });
    try {
      const { activeCircleId } = useCircleStore.getState();
      if (activeCircleId === null) {
        const res = await apiGet<{ data: { items: any[] } }>('/me/feed?type=event');
        const items = res.data?.items ?? (res as any).items ?? [];
        set({ events: items.map(mapFeedEvent), isLoading: false });
      } else {
        const hid = useHouseholdStore.getState().householdId;
        if (!hid) { set({ isLoading: false }); return; }
        const res = await apiGet<{ data: any[] }>(`/households/${hid}/events`);
        set({ events: (res.data ?? []).map(mapEvent), isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setSelectedDate: (date) => set({ selectedDate: date }),

  addEvent: async (event) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    try {
      const body: Record<string, unknown> = {
        title: event.title,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        allDay: event.allDay,
        color: event.color,
        location: event.location,
      };
      const res = await apiPost<{ data: any }>(`/households/${hid}/events`, body);
      const newEvent = res?.data ? mapEvent(res.data) : { ...event, id: `temp-${Date.now()}` };
      set((s) => ({ events: [...s.events, newEvent] }));
    } catch {
      set((s) => ({ events: [...s.events, { ...event, id: `temp-${Date.now()}` }] }));
    }
  },

  updateEvent: async (id, updates) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    const prev = get().events;
    set((s) => ({
      events: s.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
    try {
      await apiPatch(`/households/${hid}/events/${id}`, updates as Record<string, unknown>);
    } catch {
      set({ events: prev });
    }
  },

  deleteEvent: async (id) => {
    const hid = useHouseholdStore.getState().householdId;
    if (!hid) return;
    const prev = get().events;
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/events/${id}`);
    } catch {
      set({ events: prev });
    }
  },

  getEventsForDate: (date) => {
    return get().events.filter((e) => e.startDate.startsWith(date));
  },
}));
