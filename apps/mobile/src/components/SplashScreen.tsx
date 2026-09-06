import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { width: SW, height: SH } = Dimensions.get('window');
const LOGO_SIZE = Math.min(SW * 0.72, 300);

const AMBIENT_STARS = [
  // Top band
  { x: SW * 0.05, y: SH * 0.05, size: 3,   opacity: 1.0  },
  { x: SW * 0.18, y: SH * 0.03, size: 2.5, opacity: 0.88 },
  { x: SW * 0.33, y: SH * 0.06, size: 2.5, opacity: 0.80 },
  { x: SW * 0.50, y: SH * 0.02, size: 2,   opacity: 0.75 },
  { x: SW * 0.65, y: SH * 0.07, size: 3,   opacity: 0.88 },
  { x: SW * 0.80, y: SH * 0.04, size: 3.5, opacity: 0.95 },
  { x: SW * 0.93, y: SH * 0.08, size: 2.5, opacity: 0.80 },
  // Upper quarter
  { x: SW * 0.08, y: SH * 0.16, size: 3.5, opacity: 0.85 },
  { x: SW * 0.28, y: SH * 0.12, size: 2.5, opacity: 0.68 },
  { x: SW * 0.45, y: SH * 0.10, size: 2.5, opacity: 0.65 },
  { x: SW * 0.70, y: SH * 0.14, size: 3,   opacity: 0.80 },
  { x: SW * 0.88, y: SH * 0.18, size: 3.5, opacity: 0.88 },
  // Left strip
  { x: SW * 0.03, y: SH * 0.32, size: 3,   opacity: 0.72 },
  { x: SW * 0.05, y: SH * 0.50, size: 2.5, opacity: 0.60 },
  { x: SW * 0.03, y: SH * 0.67, size: 3,   opacity: 0.68 },
  // Right strip
  { x: SW * 0.94, y: SH * 0.28, size: 3,   opacity: 0.78 },
  { x: SW * 0.92, y: SH * 0.46, size: 2.5, opacity: 0.62 },
  { x: SW * 0.95, y: SH * 0.64, size: 3,   opacity: 0.72 },
  // Lower quarter
  { x: SW * 0.10, y: SH * 0.74, size: 3,   opacity: 0.65 },
  { x: SW * 0.25, y: SH * 0.82, size: 2.5, opacity: 0.55 },
  { x: SW * 0.42, y: SH * 0.78, size: 3,   opacity: 0.60 },
  { x: SW * 0.60, y: SH * 0.84, size: 2.5, opacity: 0.55 },
  { x: SW * 0.76, y: SH * 0.77, size: 3,   opacity: 0.65 },
  { x: SW * 0.88, y: SH * 0.81, size: 2.5, opacity: 0.60 },
  // Bottom band
  { x: SW * 0.08, y: SH * 0.92, size: 3,   opacity: 0.58 },
  { x: SW * 0.28, y: SH * 0.95, size: 2.5, opacity: 0.50 },
  { x: SW * 0.48, y: SH * 0.97, size: 3,   opacity: 0.55 },
  { x: SW * 0.68, y: SH * 0.94, size: 2.5, opacity: 0.50 },
  { x: SW * 0.88, y: SH * 0.91, size: 3,   opacity: 0.55 },
  // Extra scattered
  { x: SW * 0.55, y: SH * 0.22, size: 2.5, opacity: 0.62 },
  { x: SW * 0.20, y: SH * 0.40, size: 2.5, opacity: 0.52 },
  { x: SW * 0.78, y: SH * 0.55, size: 2.5, opacity: 0.58 },
];

interface Props {
  onComplete: () => void;
}

function AmbientStar({ x, y, size, opacity: baseOp, delay }: {
  x: number; y: number; size: number; opacity: number; delay: number;
}) {
  const op = useSharedValue(0);
  useEffect(() => {
    op.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(baseOp,       { duration: 900 + delay * 0.4, easing: Easing.out(Easing.quad) }),
        withTiming(baseOp * 0.45, { duration: 1600 + delay * 0.3, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true,
    ));
  }, []);
  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: x, top: y,
    width: size, height: size,
    borderRadius: size / 2,
    backgroundColor: 'white',
    opacity: op.value,
  }));
  return <Animated.View style={style} />;
}

// Shooting star — white streak that crosses the screen
function ShootingStar({ triggerAt, startY, angle }: {
  triggerAt: number; startY: number; angle: number;
}) {
  const tx = useSharedValue(-80);
  const op = useSharedValue(0);
  useEffect(() => {
    op.value = withDelay(triggerAt, withSequence(
      withTiming(0.85, { duration: 60,  easing: Easing.out(Easing.quad) }),
      withTiming(0,    { duration: 560, easing: Easing.in(Easing.quad) }),
    ));
    tx.value = withDelay(triggerAt, withTiming(SW + 100, { duration: 620, easing: Easing.out(Easing.quad) }));
  }, []);
  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    top: startY, left: 0,
    width: 60, height: 1.5,
    borderRadius: 1,
    backgroundColor: 'white',
    opacity: op.value,
    transform: [{ translateX: tx.value }, { rotate: `${angle}deg` }],
  }));
  return <Animated.View style={style} />;
}

// Animated node that gently breathes
function NodeDot({ cx, cy, baseR, fill, phase }: {
  cx: number; cy: number; baseR: number; fill: string; phase: number;
}) {
  const r = useSharedValue(baseR);
  useEffect(() => {
    r.value = withDelay(phase, withRepeat(
      withSequence(
        withTiming(baseR + 2.5, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(baseR,       { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, false,
    ));
  }, []);
  const animatedProps = useAnimatedProps(() => ({ r: r.value }));
  return <AnimatedCircle cx={cx} cy={cy} fill={fill} animatedProps={animatedProps} />;
}

// Soft circular ripple wave expanding from the heart center
function HeartRipple({ delay }: { delay: number }) {
  const r   = useSharedValue(16);
  const op  = useSharedValue(0);
  useEffect(() => {
    r.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(16, { duration: 1 }),
        withTiming(60, { duration: 3200, easing: Easing.out(Easing.quad) }),
      ),
      -1, false,
    ));
    op.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.28, { duration: 1 }),
        withTiming(0,    { duration: 3200, easing: Easing.out(Easing.cubic) }),
      ),
      -1, false,
    ));
  }, []);
  const animatedProps = useAnimatedProps(() => ({ r: r.value, opacity: op.value }));
  return <AnimatedCircle cx={200} cy={216} fill="none" stroke="#EF4444" strokeWidth={1.5} animatedProps={animatedProps} />;
}

// Crescent moon
function Moon({ fadeOp }: { fadeOp: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    top: SH * 0.07,
    left: SW * 0.72,
    opacity: fadeOp.value * 0.88,
  }));
  return (
    <Animated.View style={style}>
      <View style={moonStyles.moon}>
        <View style={moonStyles.bite} />
      </View>
    </Animated.View>
  );
}

const moonStyles = StyleSheet.create({
  moon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(210, 225, 255, 0.9)',
    overflow: 'hidden',
  },
  bite: {
    position: 'absolute',
    top: -6,
    left: 11,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F1830',
  },
});

// Glow halo behind the peak star
function PeakHalo() {
  const p = useSharedValue(0.12);
  useEffect(() => {
    p.value = withDelay(600, withRepeat(
      withSequence(
        withTiming(0.5,  { duration: 1300, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.1,  { duration: 1300, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true,
    ));
  }, []);
  const animatedProps = useAnimatedProps(() => ({
    opacity: p.value,
    r: 20 + p.value * 16,
  }));
  return <AnimatedCircle cx={200} cy={88} fill="#60A5FA" animatedProps={animatedProps} />;
}

export default function SplashScreen({ onComplete }: Props) {
  const starsOp    = useSharedValue(0);
  const logoScale  = useSharedValue(0.4);
  const logoOp     = useSharedValue(0);
  const textY      = useSharedValue(24);
  const textOp     = useSharedValue(0);
  const tagOp      = useSharedValue(0);
  const exitOp     = useSharedValue(1);
  const exitScale  = useSharedValue(1);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);

    starsOp.value   = withTiming(1, { duration: 280, easing: ease });
    logoOp.value    = withDelay(80,  withTiming(1, { duration: 280, easing: ease }));
    logoScale.value = withDelay(80,  withSpring(1, { damping: 16, stiffness: 110, mass: 1 }));

    textOp.value = withDelay(380, withTiming(1, { duration: 220, easing: ease }));
    textY.value  = withDelay(380, withTiming(0, { duration: 220, easing: ease }));
    tagOp.value  = withDelay(520, withTiming(1, { duration: 180, easing: ease }));

    exitScale.value = withDelay(1300, withTiming(1.06, { duration: 300, easing: Easing.in(Easing.cubic) }));
    exitOp.value    = withDelay(1300, withTiming(0, {
      duration: 300,
      easing: Easing.in(Easing.cubic),
    }, () => { runOnJS(onComplete)(); }));
  }, []);

  const starsStyle     = useAnimatedStyle(() => ({ opacity: starsOp.value }));
  const logoStyle      = useAnimatedStyle(() => ({
    opacity: logoOp.value,
    transform: [{ scale: logoScale.value }],
  }));
  const textStyle      = useAnimatedStyle(() => ({
    opacity: textOp.value,
    transform: [{ translateY: textY.value }],
  }));
  const tagStyle       = useAnimatedStyle(() => ({ opacity: tagOp.value }));
  const containerStyle = useAnimatedStyle(() => ({
    opacity: exitOp.value,
    transform: [{ scale: exitScale.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Ambient twinkling stars */}
      <Animated.View style={[StyleSheet.absoluteFill, starsStyle]}>
        {AMBIENT_STARS.map((star, i) => (
          <AmbientStar key={i} {...star} delay={i * 55} />
        ))}
      </Animated.View>

      {/* Moon */}
      <Moon fadeOp={starsOp} />

      {/* Shooting star — fires at 500ms, completes at ~1120ms before exit */}
      <ShootingStar triggerAt={500} startY={SH * 0.14} angle={16} />

      {/* Constellation */}
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Svg viewBox="0 0 400 400" width={LOGO_SIZE} height={LOGO_SIZE}>
          <Defs>
            <LinearGradient id="roofGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%"   stopColor="#60A5FA" stopOpacity={0.95} />
              <Stop offset="100%" stopColor="#34D399" stopOpacity={0.95} />
            </LinearGradient>
          </Defs>

          {/* Peak halo */}
          <PeakHalo />

          {/* Two roof slopes */}
          <Line x1={200} y1={88} x2={103} y2={200} stroke="url(#roofGrad)" strokeWidth={3} strokeLinecap="round" opacity={0.9} />
          <Line x1={200} y1={88} x2={297} y2={200} stroke="url(#roofGrad)" strokeWidth={3} strokeLinecap="round" opacity={0.9} />

          {/* Corner nodes — breathing */}
          <NodeDot cx={103} cy={200} baseR={9}   fill="#3B82F6" phase={0}    />
          <NodeDot cx={297} cy={200} baseR={9}   fill="#EC4899" phase={400}  />
          <NodeDot cx={103} cy={313} baseR={8.5} fill="#10B981" phase={800}  />
          <NodeDot cx={297} cy={313} baseR={8.5} fill="#F59E0B" phase={1200} />

          {/* Heart ripple waves — 3 staggered rings */}
          <HeartRipple delay={1400} />
          <HeartRipple delay={2500} />
          <HeartRipple delay={3600} />

          {/* Heart — red */}
          <Path
            d="M200,232 C200,232 180,217 180,204 C180,196 190,189 200,199 C210,189 220,196 220,204 C220,217 200,232 200,232 Z"
            fill="#EF4444"
            opacity={0.95}
          />

          {/* Roof peak star */}
          <Circle cx={200} cy={88} r={16} fill="#60A5FA" />
          <Circle cx={200} cy={88} r={9}  fill="white"   />
        </Svg>
      </Animated.View>

      {/* Brand text */}
      <Animated.View style={[styles.textWrap, textStyle]}>
        <Text style={styles.brandText}>SIVEN{'\u039B'}</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={[styles.tagWrap, tagStyle]}>
        <Text style={styles.tagline}>life, together</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1830',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: SH * 0.18,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  textWrap: {
    marginTop: 12,
    alignItems: 'center',
  },
  brandText: {
    fontSize: 34,
    fontWeight: '400',
    letterSpacing: 12,
    color: '#FFFFFF',
    opacity: 1,
  },
  tagWrap: {
    marginTop: 6,
    alignItems: 'center',
  },
  tagline: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'lowercase',
  },
});
