import { Stack } from 'expo-router';
import { colors } from '../../src/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" options={{ animation: 'fade' }} />
      <Stack.Screen
        name="register"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
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
