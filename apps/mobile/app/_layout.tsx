import { useEffect, useRef, useState } from 'react';
import { Stack, Redirect, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LogBox, StyleSheet } from 'react-native';

LogBox.ignoreAllLogs(true);
import * as ExpoSplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { colors } from '../src/constants/theme';
import SplashScreen from '../src/components/SplashScreen';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { useAuthStore } from '../src/stores/authStore';
import { useHouseholdStore, initCircleSync } from '../src/stores/householdStore';
import { initSocket, disconnectSocket } from '../src/services/socket';
import { useNotificationStore } from '../src/stores/notificationStore';
import { API_BASE_URL } from '../src/services/api';
import { startNetworkMonitoring, stopNetworkMonitoring } from '../src/services/offlineQueue';
import { registerForPushNotifications, clearBadge } from '../src/services/pushNotifications';
import { navigateToNotification } from '../src/utils/notificationNavigation';
import { refetchAllStores } from '../src/services/syncRefetch';
import { AlertProvider } from '../src/components/AlertProvider';
import { useStreakStore } from '../src/stores/streakStore';
import { ConfettiBurst } from '../src/components/ConfettiBurst';

ExpoSplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [splashAnimDone, setSplashAnimDone] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCheckedStorage = useAuthStore((s) => s.hasCheckedStorage);
  const router = useRouter();
  const segments = useSegments();
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);

  const authInitialized = useRef(false);
  const milestoneReached = useStreakStore((s) => s.milestoneReached);
  const clearMilestone = useStreakStore((s) => s.clearMilestone);

  // Only dismiss splash when BOTH auth check and animation are done
  const appReady = hasCheckedStorage && splashAnimDone;

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

      // Now that auth is loaded, initialize dependent services
      initCircleSync();
      startNetworkMonitoring(API_BASE_URL, refetchAllStores);

      // If authenticated after loading, init socket and fetch data
      const { isAuthenticated: authed } = useAuthStore.getState();
      if (authed) {
        initSocket();
        useNotificationStore.getState().fetchNotifications();
        useHouseholdStore.getState().fetchHousehold();
        registerForPushNotifications();
        useStreakStore.getState().checkIn();
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
    } else {
      disconnectSocket();
      useHouseholdStore.getState().reset();
    }
  }, [isAuthenticated]);

  // ─── Auth gate: redirect authenticated users away from auth screens ───
  useEffect(() => {
    if (!appReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, appReady, segments]);

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
  const needsAuthRedirect = !isAuthenticated && !inAuthGroup && !inJoinFlow;

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={styles.root}>
        <StatusBar style="dark" />
        <AlertProvider>
        <ErrorBoundary>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="quick-add"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="add-event"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="add-task"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="add-expense"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="add-memory"
              options={{
                presentation: 'modal',
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
            <Stack.Screen name="savings" />
            <Stack.Screen name="goals" />
            <Stack.Screen
              name="journal"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="add-journal"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="add-goal"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="log-baby"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="create-poll"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="add-timeline-entry"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="add-wellness"
              options={{
                presentation: 'modal',
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
            <Stack.Screen name="circles/create" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="circles/[id]" />
            <Stack.Screen name="list/[id]" />
            <Stack.Screen name="event/[id]" />
            <Stack.Screen name="join/[token]" />
          </Stack>
          {needsAuthRedirect && <Redirect href="/(auth)/login" />}
        </ErrorBoundary>
        </AlertProvider>
        <OfflineBanner />
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
