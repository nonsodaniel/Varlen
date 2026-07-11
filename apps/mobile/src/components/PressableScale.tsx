import React, { useRef } from 'react';
import { Pressable, ViewStyle, StyleProp, Animated } from 'react-native';
import { haptics } from '../hooks/useHaptics';

interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleDown?: number;
  disabled?: boolean;
}

export function PressableScale({
  children,
  onPress,
  style,
  scaleDown = 0.97,
  disabled = false,
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        haptics.light();
        Animated.spring(scale, { toValue: scaleDown, damping: 15, stiffness: 400, useNativeDriver: true }).start();
      }}
      onPressOut={() => {
        Animated.spring(scale, { toValue: 1, damping: 15, stiffness: 400, useNativeDriver: true }).start();
      }}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
