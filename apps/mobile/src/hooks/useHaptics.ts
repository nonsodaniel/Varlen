import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const canHaptic = Platform.OS === 'ios';

export const haptics = {
  /** Light tap — toggles, chip presses */
  light: () => {
    if (canHaptic) try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
  },
  /** Medium tap — task completion, important actions */
  medium: () => {
    if (canHaptic) try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
  },
  /** Success — savings goal reached, all tasks cleared */
  success: () => {
    if (canHaptic) try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
  },
  /** Warning — delete confirmation */
  warning: () => {
    if (canHaptic) try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
  },
  /** Selection changed — swipe threshold crossed */
  selection: () => {
    if (canHaptic) try { Haptics.selectionAsync(); } catch {}
  },
};
