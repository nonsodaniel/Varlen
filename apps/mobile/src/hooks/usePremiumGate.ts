import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { usePremiumStore } from '../stores/premiumStore';
import { useTrialStore } from '../stores/trialStore';
import { PremiumFeature, FREE_LIMITS, BETA_MODE, TRIAL_LIMIT, PREMIUM_FEATURE_INFO } from '../constants/premiumFeatures';
import { useCircleStore } from '../stores/circleStore';

export function usePremiumGate() {
  const isPremium = BETA_MODE || usePremiumStore((s) => s.isPremium);
  const router = useRouter();
  const circles = useCircleStore((s) => s.circles);
  const redirectedRef = useRef(false);
  // Track which features have already been counted during this screen's mount
  const incrementedRef = useRef<Set<PremiumFeature>>(new Set());
  // Subscribe so canAccess re-evaluates when trial counts change
  const trialCounts = useTrialStore((s) => s.usageCounts);

  const canAccess = useCallback(
    (feature: PremiumFeature): boolean => {
      if (isPremium) return true;

      switch (feature) {
        case 'multiple_circles':
          return circles.length < FREE_LIMITS.maxCircles;
        default:
          // Allow access while trial uses remain
          return (trialCounts[feature] ?? 0) < TRIAL_LIMIT;
      }
    },
    [isPremium, circles.length, trialCounts],
  );

  const requirePremium = useCallback(
    (feature: PremiumFeature): boolean => {
      if (!canAccess(feature)) {
        // Prevent infinite redirect: only redirect once per focus cycle
        if (redirectedRef.current) return false;
        redirectedRef.current = true;
        if (router.canGoBack()) router.back();
        setTimeout(() => {
          router.push(`/paywall?feature=${feature}` as any);
        }, 100);
        return false;
      }

      redirectedRef.current = false;

      // Record trial usage once per screen mount (not on every focus re-fire)
      if (!isPremium && feature !== 'multiple_circles' && !incrementedRef.current.has(feature)) {
        incrementedRef.current.add(feature);
        const newCount = useTrialStore.getState().increment(feature);
        const remaining = TRIAL_LIMIT - newCount;

        if (remaining === 0) {
          // Used the last trial — warn so user knows next visit requires subscription
          const featureName = PREMIUM_FEATURE_INFO[feature]?.title ?? 'This feature';
          setTimeout(() => {
            Alert.alert(
              'Last Free Preview',
              `You've used your last free preview of ${featureName}. Subscribe to keep access.`,
              [
                { text: 'Maybe Later', style: 'cancel' },
                {
                  text: 'See Plans',
                  onPress: () => router.push(`/paywall?feature=${feature}` as any),
                },
              ],
            );
          }, 500);
        }
      }

      return true;
    },
    [canAccess, router, isPremium],
  );

  const showPaywall = useCallback(
    (feature?: PremiumFeature) => {
      const path = feature ? `/paywall?feature=${feature}` : '/paywall';
      router.push(path as any);
    },
    [router],
  );

  return { isPremium, canAccess, requirePremium, showPaywall };
}
