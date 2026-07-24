import { Stack } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function AuthLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
      <Stack.Screen name="login" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
      <Stack.Screen
        name="register"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="verify-email"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="reset-password"
        options={{ animation: 'slide_from_right' }}
      />
    </Stack>
  );
}
