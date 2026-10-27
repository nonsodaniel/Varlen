// Called after the offline queue successfully syncs pending requests.
// Refetches all store data to replace any stale offline-xxx IDs
// with real server-assigned IDs.

import { useHouseholdStore } from '../stores/householdStore';
import { useAiStore } from '../stores/aiStore';
import { useTaskStore } from '../stores/taskStore';
import { useCalendarStore } from '../stores/calendarStore';
import { useExpenseStore } from '../stores/expenseStore';
import { useMemoryStore } from '../stores/memoryStore';
import { useGoalStore } from '../stores/goalStore';
import { usePollStore } from '../stores/pollStore';
import { useAuthStore } from '../stores/authStore';
import { useBabyLogStore } from '../stores/babyLogStore';
import { useActivityStore } from '../stores/activityStore';
import { useJournalStore } from '../stores/journalStore';
import { useWellnessStore } from '../stores/wellnessStore';
import { useCountdownStore } from '../stores/countdownStore';
import { useMealStore } from '../stores/mealStore';
import { useBudgetStore } from '../stores/budgetStore';
import { useHabitStore } from '../stores/habitStore';
import { useSavingsStore } from '../stores/savingsStore';
import { useListStore } from '../stores/listStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useChatStore } from '../stores/chatStore';
import { useNotificationStore } from '../stores/notificationStore';

/**
 * Clears all data arrays across every store so the next fetch loads fresh data.
 * Called when the user switches modes (data is mode-isolated by default).
 */
export function clearAllStoreData(): void {
  useTaskStore.setState({ tasks: [], isLoading: false });
  // Clear AI suggestions so the next fetchSuggestions call re-fetches with the new mode
  useAiStore.setState({ suggestions: [], suggestionsLastFetched: 0, suggestionsMode: '' });
  useCalendarStore.setState({ events: [], isLoading: false });
  useExpenseStore.setState({ expenses: [], isLoading: false });
  useMemoryStore.setState({ memories: [], isLoading: false });
  useGoalStore.setState({ goals: [], isLoading: false });
  usePollStore.setState({ polls: [], isLoading: false });
  useActivityStore.setState({ items: [], isLoading: false });
  useJournalStore.setState({ entries: [], isLoading: false });
  useWellnessStore.setState({ entries: [], isLoading: false });
  useCountdownStore.setState({ countdowns: [], isLoading: false });
  useMealStore.setState({ meals: [], weekPlan: [], isLoading: false });
  useBudgetStore.setState({ budgets: [], isLoading: false });
  useBabyLogStore.setState({ logs: [], isLoaded: false });
  useHabitStore.setState({ habits: [], isLoading: false });
  useSavingsStore.setState({ goals: [], isLoading: false });
  useListStore.setState({ lists: [], isLoading: false });
  useTimelineStore.setState({ entries: [], isLoading: false });
  // Chat is household-scoped, not cleared on mode switch — messages stay per-household
}

let refetchInProgress = false;

export async function refetchAllStores(): Promise<void> {
  if (!useAuthStore.getState().isAuthenticated) return;
  if (refetchInProgress) return;

  refetchInProgress = true;
  try {
    // Use allSettled so one store failure doesn't block the others
    const results = await Promise.allSettled([
      useHouseholdStore.getState().fetchHousehold(),
      useTaskStore.getState().fetchTasks(),
      useCalendarStore.getState().fetchEvents(),
      useExpenseStore.getState().fetchExpenses(),
      useMemoryStore.getState().fetchMemories(),
      useGoalStore.getState().fetchGoals(),
      usePollStore.getState().fetchPolls(),
      useBabyLogStore.getState().loadLogs(),
      useHabitStore.getState().fetchHabits(),
      useCountdownStore.getState().fetchCountdowns(),
      useSavingsStore.getState().fetchGoals(),
      useTimelineStore.getState().fetchTimeline(),
      useBudgetStore.getState().fetchBudgets(),
      useMealStore.getState().fetchMeals(),
      useJournalStore.getState().fetchEntries(),
      useWellnessStore.getState().fetchEntries(),
      useListStore.getState().fetchLists(),
      useActivityStore.getState().fetchActivity(),
      useNotificationStore.getState().fetchNotifications(),
    ]);
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      console.warn(`[syncRefetch] ${failures.length}/${results.length} store refetches failed`);
    }
  } finally {
    refetchInProgress = false;
  }
}
