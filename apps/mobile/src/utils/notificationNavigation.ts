import { Router } from 'expo-router';

const routeMap: Record<string, (id: string) => string> = {
  task: () => '/(tabs)/lists?section=tasks',
  event: (id) => id ? `/event/${id}` : '/(tabs)/calendar',
  expense: () => '/(tabs)/lists?section=money',
  poll: () => '/polls',
  goal: () => '/goals',
  memory: () => '/timeline',
  list: (id) => id ? `/list/${id}` : '/(tabs)/lists',
  routine: () => '/(tabs)/lists?section=routines',
  countdown: () => '/countdowns',
  child: () => '/(tabs)',
  baby_log: () => '/log-baby',
  budget: () => '/budget',
  timeline: () => '/timeline',
  household: () => '/(tabs)',
  wellness: () => '/wellness-trends',
  meal: () => '/meal-plan',
  circle: () => '/circles',
  activity: () => '/activity',
  reminder: () => '/(tabs)/calendar',
  chore: () => '/(tabs)/lists?section=tasks',
};

export function navigateToNotification(
  router: Router,
  resourceType?: string,
  resourceId?: string,
) {
  if (!resourceType) return;

  const key = resourceType.toLowerCase();
  const getRoute = routeMap[key];
  if (getRoute) {
    const route = getRoute(resourceId ?? '');
    router.push(route as any);
  }
}
