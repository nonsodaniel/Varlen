import React, { useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { haptics } from '../hooks/useHaptics';
import { colors, radius } from '../constants/theme';

const THRESHOLD = 80;

interface SwipeableRowProps {
  children: React.ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightColor?: string;
  leftColor?: string;
  swipeRightEnabled?: boolean;
  swipeLeftEnabled?: boolean;
}

export function SwipeableRow({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightIcon = 'checkmark-circle',
  leftIcon = 'trash',
  rightColor = colors.success,
  leftColor = colors.error,
  swipeRightEnabled = true,
  swipeLeftEnabled = true,
}: SwipeableRowProps) {
  const translateX = useSharedValue(0);
  const hasTriggeredRight = useRef(false);
  const hasTriggeredLeft = useRef(false);

  const fireHaptic = useCallback(() => {
    haptics.selection();
  }, []);

  const fireRight = useCallback(() => {
    onSwipeRight?.();
  }, [onSwipeRight]);

  const fireLeft = useCallback(() => {
    onSwipeLeft?.();
  }, [onSwipeLeft]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      const tx = e.translationX;
      if (!swipeRightEnabled && tx > 0) {
        translateX.value = 0;
        return;
      }
      if (!swipeLeftEnabled && tx < 0) {
        translateX.value = 0;
        return;
      }
      translateX.value = tx;

      // Haptic at threshold crossing
      if (tx > THRESHOLD && !hasTriggeredRight.current) {
        hasTriggeredRight.current = true;
        runOnJS(fireHaptic)();
      } else if (tx <= THRESHOLD) {
        hasTriggeredRight.current = false;
      }

      if (tx < -THRESHOLD && !hasTriggeredLeft.current) {
        hasTriggeredLeft.current = true;
        runOnJS(fireHaptic)();
      } else if (tx >= -THRESHOLD) {
        hasTriggeredLeft.current = false;
      }
    })
    .onEnd((e) => {
      if (e.translationX > THRESHOLD && swipeRightEnabled && onSwipeRight) {
        runOnJS(fireRight)();
      }
      if (e.translationX < -THRESHOLD && swipeLeftEnabled && onSwipeLeft) {
        runOnJS(fireLeft)();
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      hasTriggeredRight.current = false;
      hasTriggeredLeft.current = false;
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const rightBgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [0, THRESHOLD], [0, 1], 'clamp');
    const scale = interpolate(translateX.value, [0, THRESHOLD], [0.5, 1], 'clamp');
    return { opacity, transform: [{ scale }] };
  });

  const leftBgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [-THRESHOLD, 0], [1, 0], 'clamp');
    const scale = interpolate(translateX.value, [-THRESHOLD, 0], [1, 0.5], 'clamp');
    return { opacity, transform: [{ scale }] };
  });

  return (
    <View style={styles.container}>
      {/* Right swipe background (complete) */}
      {swipeRightEnabled && (
        <Animated.View style={[styles.bgLeft, { backgroundColor: rightColor + '20' }, rightBgStyle]}>
          <Ionicons name={rightIcon} size={22} color={rightColor} />
        </Animated.View>
      )}

      {/* Left swipe background (delete) */}
      {swipeLeftEnabled && (
        <Animated.View style={[styles.bgRight, { backgroundColor: leftColor + '20' }, leftBgStyle]}>
          <Ionicons name={leftIcon} size={22} color={leftColor} />
        </Animated.View>
      )}

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.row, rowStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.md,
  },
  row: {
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  bgLeft: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingLeft: 24,
    borderRadius: radius.md,
  },
  bgRight: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 24,
    borderRadius: radius.md,
  },
});
