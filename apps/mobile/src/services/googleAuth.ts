import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

// Lazy-load the native module — crashes in Expo Go where it doesn't exist
let GoogleSignin: any = null;
let statusCodes: any = {};
let isErrorWithCode: (error: unknown) => error is { code: string } = (_error: unknown): _error is { code: string } => false;

if (!isExpoGo) {
  try {
    const mod = require('@react-native-google-signin/google-signin');
    GoogleSignin = mod.GoogleSignin;
    statusCodes = mod.statusCodes;
    isErrorWithCode = mod.isErrorWithCode;
  } catch {
    // Native module unavailable — Google Sign-In disabled
  }
}

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

if (GoogleSignin && GOOGLE_WEB_CLIENT_ID) {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
  });
}

export function isGoogleSignInAvailable(): boolean {
  return !!GoogleSignin && !!GOOGLE_WEB_CLIENT_ID;
}

export async function signInWithGoogle(): Promise<string> {
  if (!GoogleSignin) {
    throw new Error('Google Sign-In is not available in Expo Go');
  }

  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error('Google Web Client ID is not configured');
  }

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

export function signOutGoogle(): void {
  if (GoogleSignin) {
    GoogleSignin.signOut().catch(() => {});
  }
}

export function isUserCancelledError(error: unknown): boolean {
  if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
    return true;
  }
  return error instanceof Error && (error as any).code === 'USER_CANCELLED';
}
