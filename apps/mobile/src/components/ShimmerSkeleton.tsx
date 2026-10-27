import React, { useEffect } from 'react';
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

// Hero gradient card skeleton
export function SkeletonHeroCard() {
  const { colors } = useTheme();
  return (
    <View style={[skStyles.heroCard, { backgroundColor: colors.skeleton }]}>
      <View style={skStyles.heroInner}>
        <ShimmerSkeleton width="40%" height={14} borderRadius={radius.xs} />
        <View style={{ height: spacing.sm }} />
        <ShimmerSkeleton width="65%" height={24} borderRadius={radius.sm} />
        <View style={{ height: spacing.sm }} />
        <ShimmerSkeleton width="50%" height={12} borderRadius={radius.xs} />
        <View style={{ height: spacing.lg }} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <ShimmerSkeleton width={80} height={26} borderRadius={radius.md} />
          <ShimmerSkeleton width={80} height={26} borderRadius={radius.md} />
        </View>
      </View>
    </View>
  );
}

// Section header skeleton
export function SkeletonSectionHeader() {
  return (
    <View style={skStyles.sectionHeader}>
      <ShimmerSkeleton width={8} height={8} borderRadius={4} />
      <ShimmerSkeleton width="35%" height={14} borderRadius={radius.xs} style={{ marginLeft: spacing.sm }} />
    </View>
  );
}

// Card with multiple rows (tasks, events)
export function SkeletonListCard({ rows = 3 }: { rows?: number }) {
  return (
    <View style={skStyles.listCard}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[skStyles.listCardRow, i > 0 && skStyles.listCardRowBorder]}>
          <ShimmerSkeleton width={36} height={36} borderRadius={radius.sm} />
          <View style={{ flex: 1, marginLeft: spacing.md, gap: spacing.xs }}>
            <ShimmerSkeleton width="70%" height={14} borderRadius={radius.xs} />
            <ShimmerSkeleton width="45%" height={11} borderRadius={radius.xs} />
          </View>
        </View>
      ))}
    </View>
  );
}

// Stat row (3 stats side by side)
export function SkeletonStatRow() {
  return (
    <View style={skStyles.statRow}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={skStyles.statItem}>
          <ShimmerSkeleton width={36} height={36} borderRadius={18} style={{ marginBottom: spacing.xs }} />
          <ShimmerSkeleton width={32} height={18} borderRadius={radius.xs} style={{ marginBottom: spacing.xs / 2 }} />
          <ShimmerSkeleton width={48} height={11} borderRadius={radius.xs} />
        </View>
      ))}
    </View>
  );
}

// Member row skeleton (avatar + name + subtitle)
export function SkeletonMemberRow() {
  return (
    <View style={skStyles.memberRow}>
      <ShimmerSkeleton width={44} height={44} borderRadius={22} />
      <View style={{ flex: 1, marginLeft: spacing.md, gap: spacing.xs }}>
        <ShimmerSkeleton width="50%" height={14} borderRadius={radius.xs} />
        <ShimmerSkeleton width="35%" height={11} borderRadius={radius.xs} />
      </View>
      <ShimmerSkeleton width={32} height={20} borderRadius={radius.sm} />
    </View>
  );
}

// Compact chip row (for quick actions)
export function SkeletonChipRow({ count = 4 }: { count?: number }) {
  return (
    <View style={skStyles.chipRow}>
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerSkeleton key={i} width={72} height={64} borderRadius={radius.md} />
      ))}
    </View>
  );
}

// Full home screen skeleton
export function HomeScreenSkeleton() {
  return (
    <View style={{ paddingTop: spacing.sm }}>
      {/* Hero */}
      <View style={{ paddingHorizontal: spacing.xl }}>
        <SkeletonHeroCard />
      </View>

      {/* Section 1 */}
      <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
        <SkeletonSectionHeader />
        <View style={{ height: spacing.sm }} />
        <SkeletonListCard rows={3} />
      </View>

      {/* Section 2 */}
      <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
        <SkeletonSectionHeader />
        <View style={{ height: spacing.sm }} />
        <SkeletonListCard rows={2} />
      </View>

      {/* Section 3 */}
      <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
        <SkeletonSectionHeader />
        <View style={{ height: spacing.sm }} />
        <SkeletonStatRow />
      </View>

      {/* Quick chips */}
      <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
        <SkeletonChipRow count={3} />
      </View>
    </View>
  );
}

// People/Together screen skeleton
export function TogetherScreenSkeleton() {
  return (
    <View style={{ paddingTop: spacing.sm }}>
      {/* Header */}
      <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl }}>
        <ShimmerSkeleton width="35%" height={28} borderRadius={radius.sm} />
        <View style={{ height: spacing.xs }} />
        <ShimmerSkeleton width="50%" height={14} borderRadius={radius.xs} />
      </View>

      {/* Chat bar */}
      <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.sm }}>
        <ShimmerSkeleton width="100%" height={60} borderRadius={radius.lg} />
      </View>

      {/* Connection card */}
      <View style={{ paddingHorizontal: spacing.xl }}>
        <ShimmerSkeleton width="100%" height={140} borderRadius={radius.lg} />
      </View>

      {/* Stats */}
      <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
        <SkeletonSectionHeader />
        <View style={{ height: spacing.sm }} />
        <SkeletonStatRow />
      </View>

      {/* Members */}
      <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
        <SkeletonSectionHeader />
        <View style={{ height: spacing.sm }} />
        <View style={{ gap: spacing.md }}>
          <SkeletonMemberRow />
          <SkeletonMemberRow />
        </View>
      </View>

      {/* Quick actions */}
      <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
        <SkeletonSectionHeader />
        <View style={{ height: spacing.sm }} />
        <SkeletonChipRow count={4} />
      </View>
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
  heroCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  heroInner: {
    padding: spacing.xl,
    paddingVertical: spacing.xl + 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  listCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  listCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  listCardRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: radius.xl,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
