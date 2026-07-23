import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { useHouseholdStore, getResolvedHouseholdId, ensureHouseholdId } from './householdStore';
import { useCircleStore } from './circleStore';
import { useAuthStore } from './authStore';
import { useSettingsStore } from './settingsStore';

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  toggleTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

function mapTask(t: any): Task {
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

  fetchTasks: async () => {
    const hasData = get().tasks.length > 0;
    if (hasData && Date.now() - _lastFetchedAt < 30000) return;
    set({ isLoading: !hasData });
    try {
      const { showCrossModeData } = useSettingsStore.getState();
      const hid = getResolvedHouseholdId();
      if (showCrossModeData || !hid) {
        const res = await apiGet<{ data: { items: any[] } }>('/me/feed?type=task');
        const items = res.data?.items ?? (res as any).items ?? [];
        _lastFetchedAt = Date.now();
        set({ tasks: items.map(mapFeedTask), isLoading: false });
      } else {
        const res = await apiGet<any>(`/households/${hid}/tasks`);
        const raw = res.data ?? res;
        const arr = Array.isArray(raw) ? raw : [];
        _lastFetchedAt = Date.now();
        set({ tasks: arr.map(mapTask), isLoading: false });
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
    const tempId = `temp-${Date.now()}`;
    const optimistic = { ...task, id: tempId, createdBy: task.createdBy || currentUserId };
    set((s) => ({ tasks: [...s.tasks, optimistic] }));
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
        set((s) => ({ tasks: s.tasks.map((t) => t.id === tempId ? mapTask(created) : t) }));
        _lastFetchedAt = 0;
      }
    } catch (err) {
      console.warn('[taskStore] addTask failed:', err);
      // Keep the optimistic item for offline; it will be reconciled on sync
    }
  },

  toggleTask: (id) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    // Prevent double-tap: check if toggle is already in-flight
    const task = get().tasks.find((t) => t.id === id);
    if (!task || (task as any)._toggling) return;
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed, _toggling: true } as any : t,
      ),
    }));
    apiPatch(`/households/${hid}/tasks/${id}/toggle`)
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
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().tasks;
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    const body: Record<string, unknown> = { ...updates };
    if (updates.priority) body.priority = updates.priority.toUpperCase();
    // Backend DTO expects 'assignedTo', not 'assignedToId'
    if ('assignedTo' in body) {
      // Field name already correct for the backend DTO
    }
    try {
      await apiPatch(`/households/${hid}/tasks/${id}`, body);
      _lastFetchedAt = 0;
    } catch (err) {
      console.warn('[taskStore] updateTask failed:', err);
      set({ tasks: prev });
    }
  },

  deleteTask: async (id) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().tasks;
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/tasks/${id}`);
      _lastFetchedAt = 0;
    } catch (err) {
      console.warn('[taskStore] deleteTask failed:', err);
      set({ tasks: prev });
    }
  },
    }),
    {
      name: 'sivena-tasks',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ tasks: state.tasks }),
    },
  ),
);
