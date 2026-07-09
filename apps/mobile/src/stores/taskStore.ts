import { create } from 'zustand';
import { Task } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { useHouseholdStore, getResolvedHouseholdId } from './householdStore';
import { useCircleStore } from './circleStore';

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

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,

  fetchTasks: async () => {
    set({ isLoading: true });
    try {
      const { activeCircleId } = useCircleStore.getState();
      if (activeCircleId === null) {
        // "All" mode — fetch from aggregated feed
        const res = await apiGet<{ data: { items: any[] } }>('/me/feed?type=task');
        const items = res.data?.items ?? (res as any).items ?? [];
        set({ tasks: items.map(mapFeedTask), isLoading: false });
      } else {
        // Specific circle mode
        const hid = getResolvedHouseholdId();
        if (!hid) { set({ isLoading: false }); return; }
        const res = await apiGet<any>(`/households/${hid}/tasks`);
        const raw = res.data ?? res;
        const arr = Array.isArray(raw) ? raw : [];
        set({ tasks: arr.map(mapTask), isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  addTask: async (task) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
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
      const newTask = created?.id ? mapTask(created) : { ...task, id: `temp-${Date.now()}` };
      set((s) => ({ tasks: [...s.tasks, newTask] }));
    } catch {
      // Offline fallback: add locally with temp ID
      set((s) => ({ tasks: [...s.tasks, { ...task, id: `temp-${Date.now()}` }] }));
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
    } catch {
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
    } catch {
      set({ tasks: prev });
    }
  },
}));
