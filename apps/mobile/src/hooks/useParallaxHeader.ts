import { useAnimatedStyle, interpolate, type SharedValue } from 'react-native-reanimated';

export function useParallaxHeader(scrollY: SharedValue<number>) {
  const heroStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollY.value, [-100, 0, 150], [1.05, 1, 0.95], 'clamp');
    const opacity = interpolate(scrollY.value, [0, 120], [1, 0.6], 'clamp');
    const translateY = interpolate(scrollY.value, [0, 150], [0, -30], 'clamp');
    return {
      transform: [{ scale }, { translateY }],
      opacity,
    };
  });

  return { heroStyle };
}
