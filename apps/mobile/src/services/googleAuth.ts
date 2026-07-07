import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export function isGoogleSignInAvailable(): boolean {
  return !!GOOGLE_WEB_CLIENT_ID;
}

export async function signInWithGoogle(): Promise<string> {
  const clientId = Platform.OS === 'ios' ? GOOGLE_IOS_CLIENT_ID : GOOGLE_WEB_CLIENT_ID;

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'sivena' });

  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
    responseType: AuthSession.ResponseType.IdToken,
  });

  const result = await request.promptAsync(discovery);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    const error = new Error('User cancelled');
    (error as any).code = 'USER_CANCELLED';
    throw error;
  }

  if (result.type === 'error') {
    throw new Error(result.error?.message || 'Google Sign-In failed');
  }

  if (result.type === 'success') {
    const idToken = result.params?.id_token;
    if (!idToken) {
      throw new Error('No ID token returned from Google Sign-In');
    }
    return idToken;
  }

  throw new Error('Google Sign-In failed');
}

export function isUserCancelledError(error: unknown): boolean {
  return error instanceof Error && (error as any).code === 'USER_CANCELLED';
}
