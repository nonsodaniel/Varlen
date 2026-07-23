import { useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { usePremiumStore } from '../stores/premiumStore';
import { PremiumFeature, FREE_LIMITS, BETA_MODE } from '../constants/premiumFeatures';
import { useCircleStore } from '../stores/circleStore';

export function usePremiumGate() {
  const isPremium = BETA_MODE || usePremiumStore((s) => s.isPremium);
  const router = useRouter();
  const circles = useCircleStore((s) => s.circles);
  const redirectedRef = useRef(false);

  const canAccess = useCallback(
    (feature: PremiumFeature): boolean => {
      if (isPremium) return true;

      switch (feature) {
        case 'multiple_circles':
          return circles.length < FREE_LIMITS.maxCircles;
        default:
          // Screen-gated features always blocked for free users
          return false;
      }
    },
    [isPremium, circles.length],
  );

  const requirePremium = useCallback(
    (feature: PremiumFeature): boolean => {
      if (canAccess(feature)) {
        redirectedRef.current = false;
        return true;
      }
      // Prevent infinite redirect: only redirect once per focus cycle
      if (redirectedRef.current) return false;
      redirectedRef.current = true;
      // Go back first to leave the gated screen, then push paywall
      router.back();
      setTimeout(() => {
        router.push(`/paywall?feature=${feature}` as any);
      }, 100);
      return false;
    },
    [canAccess, router],
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
