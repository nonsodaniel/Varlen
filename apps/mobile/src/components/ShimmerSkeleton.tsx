import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { radius, spacing } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface ShimmerSkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}

export function ShimmerSkeleton({
  width,
  height,
  borderRadius = radius.sm,
  style,
}: ShimmerSkeletonProps) {
  const { colors } = useTheme();
  const translateX = useSharedValue(-1);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 200 }],
  }));

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.skeleton,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={[colors.skeleton, colors.surface, colors.skeleton]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: 400, height: '100%' }}
        />
      </Animated.View>
    </View>
  );
}

export function SkeletonCard() {
  return (
    <View style={skStyles.card}>
      <ShimmerSkeleton width="100%" height={80} borderRadius={radius.lg} />
    </View>
  );
}

export function SkeletonLine({ width = '80%' }: { width?: string | number }) {
  return <ShimmerSkeleton width={width} height={14} borderRadius={radius.xs} />;
}

export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return <ShimmerSkeleton width={size} height={size} borderRadius={size / 2} />;
}

export function SkeletonTaskRow() {
  return (
    <View style={skStyles.taskRow}>
      <ShimmerSkeleton width={24} height={24} borderRadius={12} />
      <ShimmerSkeleton width="70%" height={16} borderRadius={radius.xs} style={{ marginLeft: spacing.sm }} />
    </View>
  );
}

const skStyles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
});
