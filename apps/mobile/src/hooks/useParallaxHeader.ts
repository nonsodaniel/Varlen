import { useAnimatedStyle, interpolate, type SharedValue } from 'react-native-reanimated';

export function useParallaxHeader(scrollY: SharedValue<number>) {
  const heroStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollY.value, [-100, 0, 150], [1.02, 1, 0.98], 'clamp');
    const translateY = interpolate(scrollY.value, [0, 150], [0, -20], 'clamp');
    return {
      transform: [{ scale }, { translateY }],
    };
  });

  return { heroStyle };
}
