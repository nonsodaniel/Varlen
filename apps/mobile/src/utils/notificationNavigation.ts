import { Router } from 'expo-router';

const routeMap: Record<string, (id: string) => string> = {
  task: (id) => `/tasks/${id}`,
  event: (id) => `/calendar`,
  expense: (id) => `/(tabs)/expenses`,
  poll: (id) => `/polls`,
  goal: (id) => `/goals`,
  memory: (id) => `/timeline`,
  list: (id) => `/(tabs)/lists`,
  routine: (id) => `/(tabs)/home`,
  countdown: (id) => `/(tabs)/home`,
  child: (id) => `/(tabs)/home`,
  baby_log: (id) => `/(tabs)/home`,
  budget: (id) => `/(tabs)/expenses`,
  timeline: (id) => `/timeline`,
  household: () => `/(tabs)/home`,
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
