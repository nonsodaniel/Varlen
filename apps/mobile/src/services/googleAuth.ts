import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  offlineAccess: true,
});

export async function signInWithGoogle(): Promise<string> {
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();

  if (!response.data?.idToken) {
    throw new Error('No ID token returned from Google Sign-In');
  }

  return response.data.idToken;
}

export async function signOutGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // silent — user may not have been signed in with Google
  }
}

export function isUserCancelledError(error: unknown): boolean {
  return isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED;
}
