import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableNativeFramesTracking: true,
    attachStacktrace: true,
    beforeSend(event) {
      // Strip PII from breadcrumbs in production
      if (!__DEV__) {
        event.user = event.user ? { id: event.user.id } : undefined;
      }
      return event;
    },
  });
}

export { Sentry };
