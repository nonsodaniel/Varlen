import React from 'react';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import { ViewStyle, StyleProp } from 'react-native';

interface AnimatedItemProps {
  children: React.ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Wraps a list item with a subtle fade-in on mount.
 * Stagger delay is capped for snappy feel — items appear quickly in sequence.
 */
export function AnimatedItem({ children, index = 0, style }: AnimatedItemProps) {
  const delay = Math.min(index * 50, 300);

  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(300)}
      layout={Layout.springify().damping(18)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Simple fade-in wrapper for sections/headers.
 */
export function FadeInView({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(350)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
