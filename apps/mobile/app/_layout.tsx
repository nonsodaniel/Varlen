import { useEffect, useRef, useState, useCallback } from 'react';
import { Stack, Redirect, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LogBox, StyleSheet, AccessibilityInfo } from 'react-native';
import * as Linking from 'expo-linking';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'ViewPropTypes will be removed',
  'AsyncStorage has been extracted',
  'Sending `onAnimatedValueUpdate`',
]);

// Global safety net: catch unhandled promise rejections to prevent silent freezes
if (typeof global !== 'undefined') {
  const orig = (global as any).ErrorUtils?.getGlobalHandler?.();
  (global as any).ErrorUtils?.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
    console.warn('[GlobalErrorHandler]', isFatal ? 'FATAL:' : '', error?.message);
    if (orig) orig(error, isFatal);
  });
}
import * as ExpoSplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { colors } from '../src/constants/theme';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import SplashScreen from '../src/components/SplashScreen';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { useAuthStore } from '../src/stores/authStore';
import { useHouseholdStore, initCircleSync } from '../src/stores/householdStore';
import { initSocket, disconnectSocket } from '../src/services/socket';
import { useNotificationStore } from '../src/stores/notificationStore';
import { useTaskStore } from '../src/stores/taskStore';
import { useExpenseStore } from '../src/stores/expenseStore';
import { useCalendarStore } from '../src/stores/calendarStore';
import { useListStore } from '../src/stores/listStore';
import { useMealStore } from '../src/stores/mealStore';
import { usePollStore } from '../src/stores/pollStore';
import { useGoalStore } from '../src/stores/goalStore';
import { useCountdownStore } from '../src/stores/countdownStore';
import { useTimelineStore } from '../src/stores/timelineStore';
import { useMemoryStore } from '../src/stores/memoryStore';
import { useBudgetStore } from '../src/stores/budgetStore';
import { useWellnessStore } from '../src/stores/wellnessStore';
import { useSavingsStore } from '../src/stores/savingsStore';
import { useJournalStore } from '../src/stores/journalStore';
import { useActivityStore } from '../src/stores/activityStore';
import { useHabitStore } from '../src/stores/habitStore';
import { useCircleStore } from '../src/stores/circleStore';
import { useModeHouseholdStore } from '../src/stores/modeHouseholdStore';
import { useModeStore } from '../src/stores/modeStore';
import { useReactionStore } from '../src/stores/reactionStore';
import { useSubscriptionStore } from '../src/stores/subscriptionStore';
import { API_BASE_URL } from '../src/services/api';
import { startNetworkMonitoring, stopNetworkMonitoring } from '../src/services/offlineQueue';
import { registerForPushNotifications, clearBadge } from '../src/services/pushNotifications';
import { navigateToNotification } from '../src/utils/notificationNavigation';
import { refetchAllStores } from '../src/services/syncRefetch';
import { AlertProvider } from '../src/components/AlertProvider';
import { useStreakStore } from '../src/stores/streakStore';
import { useFeatureFlagsStore } from '../src/stores/featureFlagsStore';
import { ConfettiBurst } from '../src/components/ConfettiBurst';
import { useSettingsStore } from '../src/stores/settingsStore';
import { usePremiumStore } from '../src/stores/premiumStore';
import { initRevenueCat, logoutRevenueCat } from '../src/services/revenueCat';
import { AppUpdatePrompt } from '../src/components/AppUpdatePrompt';

ExpoSplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/** Reset every Zustand store on logout so stale data never leaks across accounts */
function resetAllStores() {
  useHouseholdStore.getState().reset();
  useModeHouseholdStore.getState().clearAll();
  useTaskStore.setState({ tasks: [], isLoading: false });
  useExpenseStore.setState({ expenses: [], isLoading: false });
  useCalendarStore.setState({ events: [], isLoading: false });
  useListStore.setState({ lists: [], isLoading: false });
  useMealStore.setState({ meals: [], weekPlan: [], isLoading: false });
  useNotificationStore.setState({ notifications: [], isLoading: false });
  usePollStore.setState({ polls: [], isLoading: false });
  useGoalStore.setState({ goals: [], isLoading: false });
  useCountdownStore.setState({ countdowns: [], isLoading: false });
  useTimelineStore.setState({ entries: [], isLoading: false });
  useMemoryStore.setState({ memories: [], isLoading: false });
  useBudgetStore.setState({ budgets: [], isLoading: false });
  useWellnessStore.setState({ entries: [], isLoading: false });
  useSavingsStore.setState({ goals: [], isLoading: false });
  useJournalStore.setState({ entries: [], isLoading: false });
  useActivityStore.setState({ items: [], isLoading: false });
  useHabitStore.setState({ habits: [], isLoading: false });
  useCircleStore.setState({ circles: [], activeCircleId: null, primaryCircleId: null, isLoading: false });
  useReactionStore.setState({ reactions: {} });
  useSubscriptionStore.setState({ subscriptions: [], isLoading: false });
  useStreakStore.setState({ currentStreak: 0, bestStreak: 0, lastCheckInDate: null, milestoneReached: null });
  usePremiumStore.getState().reset();
  useFeatureFlagsStore.getState().reset();
  logoutRevenueCat();
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}

function RootLayoutInner() {
  const { colors: tc, isDark } = useTheme();
  const [splashAnimDone, setSplashAnimDone] = useState(false);
  const [storesReady, setStoresReady] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCheckedStorage = useAuthStore((s) => s.hasCheckedStorage);
  const router = useRouter();
  const segments = useSegments();
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);

  const authInitialized = useRef(false);
  const milestoneReached = useStreakStore((s) => s.milestoneReached);
  const clearMilestone = useStreakStore((s) => s.clearMilestone);
  const hasOnboarded = useSettingsStore((s) => s.hasOnboarded);

  // Only dismiss splash when auth check, store hydration, and animation are all done
  const appReady = hasCheckedStorage && storesReady && splashAnimDone;

  // Hide native splash immediately — same #0F1020 background as custom splash = seamless
  useEffect(() => {
    ExpoSplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    let mounted = true;

    const initApp = async () => {
      // Wait for auth to fully load before initializing anything else
      await useAuthStore.getState().loadStoredAuth();
      if (!mounted) return;

      authInitialized.current = true;
      setStoresReady(true);

      // Now that auth is loaded, initialize dependent services
      initCircleSync();
      startNetworkMonitoring(API_BASE_URL, refetchAllStores);

      // If authenticated after loading, init socket and fetch data
      const { isAuthenticated: authed, user } = useAuthStore.getState();
      if (authed) {
        // Seed the mode-household map for the user's current mode using their
        // existing householdId (from auth). This ensures data isolation works
        // correctly from the very first session.
        const existingHid = user?.householdId;
        if (existingHid) {
          const { mode } = useModeStore.getState();
          const { getModeHousehold, setModeHousehold } = useModeHouseholdStore.getState();
          if (!getModeHousehold(mode)) {
            setModeHousehold(mode, existingHid);
          }
          useHouseholdStore.setState({ householdId: existingHid });
        }

        initSocket();
        useNotificationStore.getState().fetchNotifications();
        useHouseholdStore.getState().fetchHousehold();
        registerForPushNotifications();
        useStreakStore.getState().checkIn();
        useFeatureFlagsStore.getState().fetchFlags().catch(() => {});
        if (user?.id) {
          initRevenueCat(user.id).then(() => {
            usePremiumStore.getState().syncWithRevenueCat();
          }).catch(() => {});
        }
      }
    };

    initApp();

    // Handle notification taps (app opened via notification)
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.resourceType && data?.resourceId) {
          navigateToNotification(router, data.resourceType as string, data.resourceId as string);
        }
        clearBadge();
      });

    return () => {
      mounted = false;
      stopNetworkMonitoring();
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, []);

  // Handle auth state changes AFTER initial load — init/cleanup services
  useEffect(() => {
    if (!authInitialized.current) return;

    if (isAuthenticated) {
      initSocket();
      useNotificationStore.getState().fetchNotifications();
      useHouseholdStore.getState().fetchHousehold();
      registerForPushNotifications();
      useFeatureFlagsStore.getState().fetchFlags().catch(() => {});
    } else {
      disconnectSocket();
      resetAllStores();
    }
  }, [isAuthenticated]);

  // ─── #10: Deep Linking Handler ───
  useEffect(() => {
    if (!appReady || !isAuthenticated) return;

    const handleDeepLink = (event: { url: string }) => {
      const parsed = Linking.parse(event.url);
      if (parsed.path?.startsWith('join/')) {
        const token = parsed.path.replace('join/', '');
        if (token) router.push(`/join/${token}` as any);
      }
    };

    const sub = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => sub.remove();
  }, [appReady, isAuthenticated]);

  // ─── Auth gate: redirect authenticated users away from auth screens ───
  useEffect(() => {
    if (!appReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && inAuthGroup) {
      // #8: Check onboarding before redirecting to tabs
      if (!hasOnboarded) {
        router.replace('/onboarding' as any);
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, appReady, segments, hasOnboarded]);

  // Show splash until both auth check and animation are complete
  if (!appReady) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <StatusBar style="light" />
        <SplashScreen onComplete={() => setSplashAnimDone(true)} />
      </GestureHandlerRootView>
    );
  }

  // Determine auth redirect synchronously — prevents flash of protected content
  const inAuthGroup = segments[0] === '(auth)';
  const inJoinFlow = segments[0] === 'join';
  const inOnboarding = (segments[0] as string) === 'onboarding';
  const needsAuthRedirect = !isAuthenticated && !inAuthGroup && !inJoinFlow && !inOnboarding;
  const needsOnboarding = isAuthenticated && !hasOnboarded && !inOnboarding && !inAuthGroup;

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={styles.root}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AlertProvider>
        <ErrorBoundary>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: tc.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="quick-add"
              options={{
                presentation: 'transparentModal',
                animation: 'fade',
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
            <Stack.Screen
              name="add-event"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="add-task"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="add-expense"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="add-memory"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="paywall"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen name="date-ideas" />
            <Stack.Screen name="insights" />
            <Stack.Screen name="timeline" />
            <Stack.Screen name="polls" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="privacy-policy" />
            <Stack.Screen name="terms" />
            <Stack.Screen name="settle-up" />
            <Stack.Screen name="budget" />
            <Stack.Screen name="add-habit" />
            <Stack.Screen name="add-list" />
            <Stack.Screen name="savings" />
            <Stack.Screen name="goals" />
            <Stack.Screen
              name="journal"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="add-journal"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="add-goal"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="log-baby"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="create-poll"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="add-timeline-entry"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="add-wellness"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen name="wellness-trends" />
            <Stack.Screen name="countdowns" />
            <Stack.Screen name="activity" />
            <Stack.Screen name="expense-insights" />
            <Stack.Screen name="meal-plan" />
            <Stack.Screen name="challenges" />
            <Stack.Screen name="weekly-recap" />
            <Stack.Screen name="invite" />
            <Stack.Screen name="circles/index" />
            <Stack.Screen name="circles/create" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="circles/[id]" />
            <Stack.Screen name="list/[id]" />
            <Stack.Screen name="event/[id]" />
            <Stack.Screen name="join/[token]" />
          </Stack>
          {needsAuthRedirect && <Redirect href="/(auth)/welcome" />}
          {needsOnboarding && <Redirect href={'/onboarding' as any} />}
        </ErrorBoundary>
        </AlertProvider>
        <OfflineBanner />
        <AppUpdatePrompt />
        <ConfettiBurst trigger={milestoneReached !== null} onComplete={clearMilestone} />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
