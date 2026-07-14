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
import { radius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

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
  rightColor,
  leftColor,
  swipeRightEnabled = true,
  swipeLeftEnabled = true,
}: SwipeableRowProps) {
  const { colors } = useTheme();
  const resolvedRightColor = rightColor ?? colors.success;
  const resolvedLeftColor = leftColor ?? colors.error;

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
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel="Swipeable row"
      accessibilityHint={
        swipeRightEnabled && swipeLeftEnabled
          ? 'Swipe right to complete, swipe left to delete'
          : swipeRightEnabled
          ? 'Swipe right to complete'
          : swipeLeftEnabled
          ? 'Swipe left to delete'
          : undefined
      }
    >
      {/* Right swipe background (complete) */}
      {swipeRightEnabled && (
        <Animated.View
          style={[styles.bgLeft, { backgroundColor: resolvedRightColor + '20' }, rightBgStyle]}
          accessibilityLabel="Complete action"
        >
          <Ionicons name={rightIcon} size={22} color={resolvedRightColor} />
        </Animated.View>
      )}

      {/* Left swipe background (delete) */}
      {swipeLeftEnabled && (
        <Animated.View
          style={[styles.bgRight, { backgroundColor: resolvedLeftColor + '20' }, leftBgStyle]}
          accessibilityLabel="Delete action"
        >
          <Ionicons name={leftIcon} size={22} color={resolvedLeftColor} />
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
