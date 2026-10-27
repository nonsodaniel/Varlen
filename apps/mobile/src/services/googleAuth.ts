import Constants from 'expo-constants';

// ── Google Sign-In — GCC OAuth client requirements ──────────────────────────
// Project: sivena (130358336300)
// Two Android OAuth clients MUST exist in GCC → APIs & Services → Credentials:
//
//   1. Dev / preview builds  (credentials.json → debug.keystore, committed to repo)
//      Package : com.sivena.app
//      SHA-1   : 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
//
//   2. Production / Play Store builds  (Play App Signing — Google re-signs the AAB)
//      Package : com.sivena.app
//      SHA-1   : 59:74:81:F5:F1:EF:BF:0F:15:B8:AF:E0:45:BC:47:7C:79:AD:31:CA
//
// DO NOT delete or replace apps/mobile/debug.keystore — it is the source of SHA-1 #1.
// If you add a new eas.json build profile, register its signing SHA-1 in GCC as well.
// DEVELOPER_ERROR (code 10) on Android means a SHA-1 is missing from GCC.
// ────────────────────────────────────────────────────────────────────────────

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

  let response: any;
  try {
    response = await GoogleSignin.signIn();
  } catch (err: any) {
    // DEVELOPER_ERROR (code 10) means the app's signing certificate SHA-1 is not registered
    // in Google Cloud Console. Surface a clear message instead of a raw native crash.
    const code: string = err?.code ?? '';
    if (
      code === '10' ||
      code === 'DEVELOPER_ERROR' ||
      (statusCodes && code === statusCodes.DEVELOPER_ERROR)
    ) {
      const friendly = new Error('Google Sign-In configuration error. Please try again later.');
      (friendly as any).code = 'DEVELOPER_ERROR';
      throw friendly;
    }
    throw err;
  }

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
