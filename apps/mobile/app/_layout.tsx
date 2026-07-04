import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { colors } from '../src/constants/theme';
import SplashScreen from '../src/components/SplashScreen';
import { useAuthStore } from '../src/stores/authStore';
import { initSocket, disconnectSocket } from '../src/services/socket';
import { useNotificationStore } from '../src/stores/notificationStore';

ExpoSplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    ExpoSplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      initSocket();
      useNotificationStore.getState().fetchNotifications();
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={styles.root}>
        <StatusBar style={showSplash ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
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
            name="(auth)"
            options={{ headerShown: false, animation: 'fade' }}
          />
        </Stack>
        {showSplash && (
          <SplashScreen onComplete={() => setShowSplash(false)} />
        )}
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
