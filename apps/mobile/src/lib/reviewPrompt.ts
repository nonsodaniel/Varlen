import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'sivena_review_prompted';
const TASK_COUNT_KEY = 'sivena_tasks_completed';
const TASK_THRESHOLD = 3;

/**
 * Call after a positive user action (task completed, memory added).
 * Shows the native review prompt once — after the user has completed
 * 3 tasks OR added their first memory, whichever comes first.
 */
export async function maybeRequestReview(trigger: 'task' | 'memory') {
  try {
    const alreadyPrompted = await AsyncStorage.getItem(STORAGE_KEY);
    if (alreadyPrompted) return;

    if (!(await StoreReview.isAvailableAsync())) return;

    if (trigger === 'memory') {
      await AsyncStorage.setItem(STORAGE_KEY, '1');
      await StoreReview.requestReview();
      return;
    }

    if (trigger === 'task') {
      const raw = await AsyncStorage.getItem(TASK_COUNT_KEY);
      const count = parseInt(raw ?? '0', 10) + 1;
      await AsyncStorage.setItem(TASK_COUNT_KEY, String(count));
      if (count >= TASK_THRESHOLD) {
        await AsyncStorage.setItem(STORAGE_KEY, '1');
        await StoreReview.requestReview();
      }
    }
  } catch {
    // Never crash the app over a review prompt
  }
}
