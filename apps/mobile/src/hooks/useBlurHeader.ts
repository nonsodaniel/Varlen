import { useMemo } from 'react';
import { useAnimatedStyle, interpolate, SharedValue } from 'react-native-reanimated';

export function useBlurHeader(scrollY: SharedValue<number>, threshold = 80) {
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, threshold],
      [0, 1],
      'clamp',
    );
    return { opacity };
  });

  const headerBlurIntensity = useMemo(() => {
    // BlurView intensity can't be animated directly — we control visibility
    // via the container opacity above. Use a fixed intensity.
    return 60;
  }, []);

  return { headerAnimatedStyle, headerBlurIntensity };
}
