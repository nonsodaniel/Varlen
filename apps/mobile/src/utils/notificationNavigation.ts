import { Router } from 'expo-router';

const routeMap: Record<string, (id: string) => string> = {
  task: () => `/(tabs)/lists?section=tasks`,
  event: (id) => `/event/${id}`,
  expense: () => `/(tabs)/lists?section=money`,
  poll: () => `/polls`,
  goal: () => `/goals`,
  memory: () => `/timeline`,
  list: (id) => `/list/${id}`,
  routine: () => `/(tabs)/lists?section=routines`,
  countdown: () => `/(tabs)`,
  child: () => `/(tabs)`,
  baby_log: () => `/log-baby`,
  budget: () => `/(tabs)/lists?section=money`,
  timeline: () => `/timeline`,
  household: () => `/(tabs)`,
};

export function navigateToNotification(
  router: Router,
  resourceType?: string,
  resourceId?: string,
) {
  if (!resourceType) return;

  const getRoute = routeMap[resourceType];
  if (getRoute) {
    const route = getRoute(resourceId ?? '');
    router.push(route as any);
  }
}
