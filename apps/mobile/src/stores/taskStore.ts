import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, LifeMode } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { useHouseholdStore, getResolvedHouseholdId, ensureHouseholdId } from './householdStore';
import { useCircleStore } from './circleStore';
import { useAuthStore } from './authStore';
import { useSettingsStore } from './settingsStore';
import { maybeRequestReview } from '../lib/reviewPrompt';

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  _modeMap: Record<string, LifeMode>;
  _visibleModesMap: Record<string, LifeMode[]>;
  fetchTasks: (force?: boolean) => Promise<void>;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  toggleTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

function mapTask(t: any, existingMode?: Task['mode'], existingVisibleModes?: Task['visibleModes']): Task {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? undefined,
    completed: t.status === 'COMPLETED' || t.completed === true,
    dueDate: t.dueDate ?? undefined,
    priority: (t.priority ?? 'medium').toLowerCase() as Task['priority'],
    assignedTo: t.assignedToId ?? t.assignedTo ?? undefined,
    createdBy: t.createdById ?? t.createdBy ?? '',
    shared: t.shared ?? true,
    category: t.category ?? undefined,
    recurring: t.recurring ? (t.recurring as string).toLowerCase() as Task['recurring'] : undefined,
    isChore: t.isChore ?? false,
    mode: (t.mode ?? existingMode ?? undefined) as Task['mode'] | undefined,
    visibleModes: (t.visibleModes ?? existingVisibleModes ?? undefined) as Task['visibleModes'],
  };
}

function mapFeedTask(item: any): Task {
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? undefined,
    completed: item.metadata?.completed ?? false,
    dueDate: item.metadata?.dueDate ?? undefined,
    priority: (item.metadata?.priority ?? 'medium').toLowerCase() as Task['priority'],
    assignedTo: item.metadata?.assignedToId ?? undefined,
    createdBy: item.createdById ?? '',
    shared: true,
    category: undefined,
    recurring: undefined,
    isChore: false,
  };
}

let _lastFetchedAt = 0;

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
  tasks: [],
  isLoading: false,
  _modeMap: {},
  _visibleModesMap: {},

  fetchTasks: async (force?: boolean) => {
    const hasData = get().tasks.length > 0;
    if (!force && hasData && Date.now() - _lastFetchedAt < 30000) return;
    set({ isLoading: !hasData });
    try {
      const { showCrossModeData } = useSettingsStore.getState();
      const hid = getResolvedHouseholdId();

      if (showCrossModeData) {
        // Explicit cross-mode view: aggregate all households
        const res = await apiGet<{ data: { items: any[] } }>('/me/feed?type=task');
        const items = res.data?.items ?? (res as any).items ?? [];
        _lastFetchedAt = Date.now();
        set({ tasks: items.map(mapFeedTask), isLoading: false });
      } else if (hid) {
        // Normal mode-isolated fetch: only this mode's household
        const res = await apiGet<any>(`/households/${hid}/tasks`);
        const raw = res.data ?? res;
        const arr = Array.isArray(raw) ? raw : [];
        // Build local mode/visibleModes preservation maps (same pattern as memoryStore)
        const localModeMap: Record<string, LifeMode> = {
          ...Object.fromEntries(get().tasks.filter((t) => t.mode).map((t) => [t.id, t.mode!])),
          ...get()._modeMap,
        };
        const localVisibleModesMap: Record<string, LifeMode[]> = {
          ...Object.fromEntries(get().tasks.filter((t) => t.visibleModes).map((t) => [t.id, t.visibleModes!])),
          ...get()._visibleModesMap,
        };
        _lastFetchedAt = Date.now();
        // Tag each task with its source household ID so delete/update use the right HID
        set({ tasks: arr.map((t: any) => ({ ...mapTask(t, localModeMap[t.id], localVisibleModesMap[t.id]), _hid: hid })), isLoading: false });
      } else {
        // No household resolved — show empty rather than /me/feed (which exposes all modes' data)
        set({ tasks: [], isLoading: false });
      }
    } catch (err) {
      console.warn('[taskStore] fetchTasks failed:', err);
      set({ isLoading: false });
    }
  },

  addTask: async (task) => {
    const hid = await ensureHouseholdId();
    if (!hid) return;
    // Optimistic: add with temp ID immediately
    const currentUserId = useAuthStore.getState().user?.id ?? '';
    let currentMode: LifeMode = 'personal';
    try { currentMode = ((require('./modeStore').useModeStore as any).getState().mode as LifeMode) ?? 'personal'; } catch { }
    const tempId = `temp-${Date.now()}`;
    const optimistic = { ...task, id: tempId, createdBy: task.createdBy || currentUserId, mode: currentMode };
    set((s) => ({
      tasks: [...s.tasks, optimistic],
      _modeMap: currentMode ? { ...s._modeMap, [tempId]: currentMode } : s._modeMap,
    }));
    try {
      const body: Record<string, unknown> = {
        title: task.title,
        description: task.description,
        priority: (task.priority ?? 'medium').toUpperCase(),
        dueDate: task.dueDate,
        assignedTo: task.assignedTo,
        category: task.category,
        isChore: task.isChore,
        shared: task.shared,
      };
      const res = await apiPost<any>(`/households/${hid}/tasks`, body);
      const created = res?.data ?? res;
      if (created?.id) {
        set((s) => {
          const newModeMap = { ...s._modeMap };
          if (currentMode) { newModeMap[created.id] = currentMode; }
          delete newModeMap[tempId];
          return {
            tasks: s.tasks.map((t) => t.id === tempId ? { ...mapTask(created, currentMode), _hid: hid } : t),
            _modeMap: newModeMap,
          };
        });
        _lastFetchedAt = 0;
      }
    } catch (err) {
      console.warn('[taskStore] addTask failed:', err);
      // Keep the optimistic item for offline; it will be reconciled on sync
    }
  },

  toggleTask: (id) => {
    // Use the task's own household ID (tagged at fetch time) so toggle always hits the right endpoint
    const task = get().tasks.find((t) => t.id === id);
    const hid = (task as any)?._hid ?? getResolvedHouseholdId();
    if (!hid) return;
    if (!task || (task as any)._toggling) return;
    const completing = !task.completed;
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed, _toggling: true } as any : t,
      ),
    }));
    apiPatch(`/households/${hid}/tasks/${id}/toggle`)
      .then(() => {
        if (completing) maybeRequestReview('task');
      })
      .catch(() => {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t,
          ),
        }));
      })
      .finally(() => {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, _toggling: undefined } : t,
          ),
        }));
      });
  },

  updateTask: async (id, updates) => {
    const task = get().tasks.find((t) => t.id === id);
    const hid = (task as any)?._hid ?? getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().tasks;
    set((s) => {
      const newVisibleModesMap = updates.visibleModes !== undefined
        ? { ...s._visibleModesMap, [id]: updates.visibleModes as LifeMode[] }
        : s._visibleModesMap;
      const newModeMap = updates.mode !== undefined
        ? { ...s._modeMap, [id]: updates.mode as LifeMode }
        : s._modeMap;
      return {
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        _modeMap: newModeMap,
        _visibleModesMap: newVisibleModesMap,
      };
    });
    // mode and visibleModes are client-side only — strip before sending to server
    const { visibleModes, mode, ...serverUpdates } = updates;
    const body: Record<string, unknown> = { ...serverUpdates };
    if (serverUpdates.priority) body.priority = (serverUpdates.priority as string).toUpperCase();
    try {
      if (Object.keys(body).length > 0) {
        await apiPatch(`/households/${hid}/tasks/${id}`, body);
        _lastFetchedAt = 0;
      }
    } catch (err) {
      console.warn('[taskStore] updateTask failed:', err);
      set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? (prev.find((p) => p.id === id) ?? t) : t) }));
    }
  },

  deleteTask: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    const hid = (task as any)?._hid ?? getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().tasks;
    set((s) => {
      const newModeMap = { ...s._modeMap };
      const newVisibleModesMap = { ...s._visibleModesMap };
      delete newModeMap[id];
      delete newVisibleModesMap[id];
      return {
        tasks: s.tasks.filter((t) => t.id !== id),
        _modeMap: newModeMap,
        _visibleModesMap: newVisibleModesMap,
      };
    });
    try {
      await apiDelete(`/households/${hid}/tasks/${id}`);
      _lastFetchedAt = 0;
    } catch (err) {
      console.warn('[taskStore] deleteTask failed:', err);
      const original = prev.find((t) => t.id === id);
      if (original) {
        set((s) => ({
          tasks: s.tasks.some((t) => t.id === id) ? s.tasks : [original, ...s.tasks],
          _modeMap: original.mode ? { ...s._modeMap, [id]: original.mode } : s._modeMap,
          _visibleModesMap: original.visibleModes ? { ...s._visibleModesMap, [id]: original.visibleModes } : s._visibleModesMap,
        }));
      }
    }
  },
    }),
    {
      name: 'sivena-tasks',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only the mode/visibleModes maps — never persist tasks themselves to prevent cross-mode leakage
      partialize: (state) => ({
        _modeMap: state._modeMap,
        _visibleModesMap: state._visibleModesMap,
      }),
    },
  ),
);
