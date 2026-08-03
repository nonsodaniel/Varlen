import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

export function isAppleSignInAvailable(): boolean {
  return Platform.OS === 'ios';
}

export async function signInWithApple(): Promise<{
  identityToken: string;
  fullName: string | null;
}> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('No identity token returned from Apple Sign-In');
  }

  const given = credential.fullName?.givenName?.trim() ?? '';
  const family = credential.fullName?.familyName?.trim() ?? '';
  const fullName = [given, family].filter(Boolean).join(' ') || null;

  return {
    identityToken: credential.identityToken,
    fullName,
  };
}

export function isUserCancelledAppleError(error: unknown): boolean {
  return (error as any)?.code === 'ERR_REQUEST_CANCELED';
}
