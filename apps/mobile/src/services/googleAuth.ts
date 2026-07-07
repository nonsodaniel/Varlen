import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

// Configure at module load time.
// webClientId tells the native SDK to request an ID token whose audience
// matches the web client ID — exactly what the backend expects.
if (GOOGLE_WEB_CLIENT_ID) {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
  });
}

export function isGoogleSignInAvailable(): boolean {
  return !!GOOGLE_WEB_CLIENT_ID;
}

export async function signInWithGoogle(): Promise<string> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error('Google Web Client ID is not configured');
  }

  // Check Play Services on Android (no-op on iOS)
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();

  if (response.type === 'cancelled') {
    const error = new Error('User cancelled');
    (error as any).code = 'USER_CANCELLED';
    throw error;
  }

  const idToken = response.data?.idToken;
  if (!idToken) {
    throw new Error('No ID token returned from Google Sign-In');
  }

  return idToken;
}

export function isUserCancelledError(error: unknown): boolean {
  if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
    return true;
  }
  return error instanceof Error && (error as any).code === 'USER_CANCELLED';
}
