// Called after the offline queue successfully syncs pending requests.
// Refetches all store data to replace any stale offline-xxx IDs
// with real server-assigned IDs.

import { useHouseholdStore } from '../stores/householdStore';
import { useTaskStore } from '../stores/taskStore';
import { useCalendarStore } from '../stores/calendarStore';
import { useExpenseStore } from '../stores/expenseStore';
import { useMemoryStore } from '../stores/memoryStore';
import { useGoalStore } from '../stores/goalStore';
import { usePollStore } from '../stores/pollStore';
import { useAuthStore } from '../stores/authStore';

let refetchInProgress = false;

export async function refetchAllStores(): Promise<void> {
  if (!useAuthStore.getState().isAuthenticated) return;
  if (refetchInProgress) return;

  refetchInProgress = true;
  try {
    await Promise.all([
      useHouseholdStore.getState().fetchHousehold(),
      useTaskStore.getState().fetchTasks(),
      useCalendarStore.getState().fetchEvents(),
      useExpenseStore.getState().fetchExpenses(),
      useMemoryStore.getState().fetchMemories(),
      useGoalStore.getState().fetchGoals(),
      usePollStore.getState().fetchPolls(),
    ]);
  } finally {
    refetchInProgress = false;
  }
}
