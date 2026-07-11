import React from 'react';
import Animated, { FadeInUp } from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';

interface AnimatedCardEntranceProps {
  index: number;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function AnimatedCardEntrance({ index, children, style }: AnimatedCardEntranceProps) {
  return (
    <Animated.View
      entering={FadeInUp.delay(index * 60).springify().damping(18).stiffness(200)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
