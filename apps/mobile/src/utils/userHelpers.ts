import { useAuthStore } from '../stores/authStore';
import { useHouseholdStore } from '../stores/householdStore';
import { colors } from '../constants/theme';

/**
 * Get a user's display name by ID.
 * Reads from auth + household stores (non-reactive, use inside render or callbacks).
 */
export function getUserName(userId: string): string {
  const user = useAuthStore.getState().user;
  if (user && userId === user.id) return user.name;
  const { members } = useHouseholdStore.getState();
  const member = members.find((m) => m.id === userId);
  if (member) return member.name;
  const children = useHouseholdStore.getState().household?.children ?? [];
  const child = children.find((c) => c.id === userId);
  return child?.name ?? 'Unknown';
}

/**
 * Get a user's initials by ID.
 */
export function getUserInitials(userId: string): string {
  const name = getUserName(userId);
  return name.charAt(0).toUpperCase();
}

/**
 * Get a user's color by ID.
 * Returns primary color for current user, or the member's assigned color.
 */
export function getUserColor(userId: string): string {
  const user = useAuthStore.getState().user;
  if (user && userId === user.id) return colors.primary;
  const { members } = useHouseholdStore.getState();
  const member = members.find((m) => m.id === userId);
  if (member?.color) return member.color;
  const children = useHouseholdStore.getState().household?.children ?? [];
  const child = children.find((c) => c.id === userId);
  return child?.color ?? '#9CA3AF';
}
