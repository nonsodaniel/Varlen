import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalendarEvent, LifeMode } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { useHouseholdStore, getResolvedHouseholdId, ensureHouseholdId } from './householdStore';
import { useCircleStore } from './circleStore';
import { useSettingsStore } from './settingsStore';
import { useAuthStore } from './authStore';

interface CalendarState {
  events: CalendarEvent[];
  selectedDate: string;
  isLoading: boolean;
  _modeMap: Record<string, LifeMode>;
  _visibleModesMap: Record<string, LifeMode[]>;
  fetchEvents: (force?: boolean) => Promise<void>;
  setSelectedDate: (date: string) => void;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<CalendarEvent | null>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsForDate: (date: string) => CalendarEvent[];
}

function mapEvent(e: any, existingMode?: CalendarEvent['mode'], existingVisibleModes?: CalendarEvent['visibleModes']): CalendarEvent {
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
    mode: (e.mode ?? existingMode ?? undefined) as CalendarEvent['mode'] | undefined,
    visibleModes: (e.visibleModes ?? existingVisibleModes ?? undefined) as CalendarEvent['visibleModes'],
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
  _modeMap: {},
  _visibleModesMap: {},

  fetchEvents: async (force?: boolean) => {
    const hasData = get().events.length > 0;
    if (!force && hasData && Date.now() - _lastFetchedAt < 30000) return;
    set({ isLoading: !hasData });
    try {
      const { showCrossModeData } = useSettingsStore.getState();
      const hid = getResolvedHouseholdId();
      // showCrossModeData: use personal feed to aggregate all modes.
      // Otherwise use the specific household (mode-isolated).
      if (showCrossModeData) {
        const res = await apiGet<{ data: { items: any[] } }>('/me/feed?type=event');
        const items = res.data?.items ?? (res as any).items ?? [];
        _lastFetchedAt = Date.now();
        set({ events: items.map(mapFeedEvent), isLoading: false });
      } else if (hid) {
        const res = await apiGet<any>(`/households/${hid}/events`);
        const raw = res.data ?? res;
        const arr = Array.isArray(raw) ? raw : [];
        const localModeMap: Record<string, LifeMode> = {
          ...Object.fromEntries(get().events.filter((e) => e.mode).map((e) => [e.id, e.mode!])),
          ...get()._modeMap,
        };
        const localVisibleModesMap: Record<string, LifeMode[]> = {
          ...Object.fromEntries(get().events.filter((e) => e.visibleModes).map((e) => [e.id, e.visibleModes!])),
          ...get()._visibleModesMap,
        };
        _lastFetchedAt = Date.now();
        set({ events: arr.map((e: any) => ({ ...mapEvent(e, localModeMap[e.id], localVisibleModesMap[e.id]), _hid: hid })), isLoading: false });
      } else {
        // No household for this mode — show empty, never fall to /me/feed
        set({ events: [], isLoading: false });
      }
    } catch (err) {
      console.warn('[calendarStore] fetchEvents failed:', err);
      set({ isLoading: false });
    }
  },

  setSelectedDate: (date) => set({ selectedDate: date }),

  addEvent: async (event) => {
    const hid = await ensureHouseholdId();
    if (!hid) return null;
    const currentUserId = useAuthStore.getState().user?.id ?? '';
    let currentMode: LifeMode = 'personal';
    try { currentMode = ((require('./modeStore').useModeStore as any).getState().mode as LifeMode) ?? 'personal'; } catch { }
    const tempId = `temp-${Date.now()}`;
    set((s) => ({
      events: [...s.events, { ...event, id: tempId, createdBy: event.createdBy || currentUserId, mode: currentMode }],
      _modeMap: currentMode ? { ...s._modeMap, [tempId]: currentMode } : s._modeMap,
    }));
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
        set((s) => {
          const newModeMap = { ...s._modeMap };
          if (currentMode) { newModeMap[created.id] = currentMode; }
          delete newModeMap[tempId];
          return {
            events: s.events.map((e) => e.id === tempId ? { ...mapEvent(created, currentMode), _hid: hid } : e),
            _modeMap: newModeMap,
          };
        });
        _lastFetchedAt = 0;
        return get().events.find((e) => e.id === created.id) ?? null;
      }
    } catch (err) {
      console.warn('[calendarStore] addEvent failed:', err);
    }
    return null;
  },

  updateEvent: async (id, updates) => {
    const event = get().events.find((e) => e.id === id);
    const hid = (event as any)?._hid ?? getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().events;
    set((s) => {
      const newVisibleModesMap = updates.visibleModes !== undefined
        ? { ...s._visibleModesMap, [id]: updates.visibleModes as LifeMode[] }
        : s._visibleModesMap;
      const newModeMap = updates.mode !== undefined
        ? { ...s._modeMap, [id]: updates.mode as LifeMode }
        : s._modeMap;
      return {
        events: s.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        _modeMap: newModeMap,
        _visibleModesMap: newVisibleModesMap,
      };
    });
    // mode and visibleModes are client-side only — strip before sending to server
    const { visibleModes, mode, ...serverUpdates } = updates;
    try {
      if (Object.keys(serverUpdates).length > 0) {
        await apiPatch(`/households/${hid}/events/${id}`, serverUpdates as Record<string, unknown>);
        _lastFetchedAt = 0;
      }
    } catch (err) {
      console.warn('[calendarStore] updateEvent failed:', err);
      set((s) => ({ events: s.events.map((e) => e.id === id ? (prev.find((p) => p.id === id) ?? e) : e) }));
    }
  },

  deleteEvent: async (id) => {
    const event = get().events.find((e) => e.id === id);
    const hid = (event as any)?._hid ?? getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().events;
    set((s) => {
      const newModeMap = { ...s._modeMap };
      const newVisibleModesMap = { ...s._visibleModesMap };
      delete newModeMap[id];
      delete newVisibleModesMap[id];
      return {
        events: s.events.filter((e) => e.id !== id),
        _modeMap: newModeMap,
        _visibleModesMap: newVisibleModesMap,
      };
    });
    try {
      await apiDelete(`/households/${hid}/events/${id}`);
      _lastFetchedAt = 0;
    } catch (err) {
      console.warn('[calendarStore] deleteEvent failed:', err);
      const original = prev.find((e) => e.id === id);
      if (original) {
        set((s) => ({
          events: s.events.some((e) => e.id === id) ? s.events : [original, ...s.events],
          _modeMap: original.mode ? { ...s._modeMap, [id]: original.mode } : s._modeMap,
          _visibleModesMap: original.visibleModes ? { ...s._visibleModesMap, [id]: original.visibleModes } : s._visibleModesMap,
        }));
      }
    }
  },

  getEventsForDate: (date) => {
    return get().events.filter((e) => e.startDate.startsWith(date));
  },
    }),
    {
      name: 'sivena-calendar',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        selectedDate: state.selectedDate,
        _modeMap: state._modeMap,
        _visibleModesMap: state._visibleModesMap,
      }),
    },
  ),
);
