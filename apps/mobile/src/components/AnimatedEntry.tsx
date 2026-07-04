import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeInLeft,
  FadeInRight,
  SlideInDown,
  SlideInRight,
  Layout,
} from 'react-native-reanimated';
import { ViewStyle } from 'react-native';

interface AnimatedEntryProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
}

/**
 * Fade-in with upward slide. Use for cards and sections.
 */
export function FadeSlideUp({ children, delay = 0, duration = 400, style }: AnimatedEntryProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 20, stiffness: 200 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

/**
 * Scale-in with bounce. Use for small interactive elements like badges and icons.
 */
export function ScaleBounce({ children, delay = 0, style }: AnimatedEntryProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 200 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

/**
 * Staggered list animation. Wrap each list item with increasing index.
 */
export function StaggerItem({ children, index = 0, style }: AnimatedEntryProps & { index?: number }) {
  const delay = Math.min(index * 60, 600); // Cap at 600ms total
  return <FadeSlideUp delay={delay} style={style}>{children}</FadeSlideUp>;
}

/**
 * Horizontal slide-in. Use for horizontal scroll items.
 */
export function SlideInHorizontal({ children, delay = 0, style }: AnimatedEntryProps) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(30);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }));
    translateX.value = withDelay(delay, withSpring(0, { damping: 20, stiffness: 180 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

// Re-export reanimated's built-in entering animations for convenience
export {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeInLeft,
  FadeInRight,
  SlideInDown,
  SlideInRight,
  Layout,
};

export { default as Animated } from 'react-native-reanimated';
