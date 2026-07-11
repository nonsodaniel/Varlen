import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const canHaptic = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptics = {
  /** Light tap — toggles, chip presses */
  light: () => {
    if (canHaptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  /** Medium tap — task completion, important actions */
  medium: () => {
    if (canHaptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  /** Success — savings goal reached, all tasks cleared */
  success: () => {
    if (canHaptic) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  /** Warning — delete confirmation */
  warning: () => {
    if (canHaptic) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
  /** Selection changed — swipe threshold crossed */
  selection: () => {
    if (canHaptic) Haptics.selectionAsync();
  },
};
