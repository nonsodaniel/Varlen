import React, { useEffect } from 'react';
import { View, Dimensions, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Line,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

const { width: SW, height: SH } = Dimensions.get('window');
const LOGO_SIZE = Math.min(SW * 0.55, 220);

const LINES = [
  { x1: 200, y1: 260, x2: 140, y2: 200 },
  { x1: 140, y1: 200, x2: 130, y2: 160 },
  { x1: 130, y1: 160, x2: 155, y2: 135 },
  { x1: 155, y1: 135, x2: 185, y2: 140 },
  { x1: 185, y1: 140, x2: 200, y2: 165 },
  { x1: 200, y1: 165, x2: 215, y2: 140 },
  { x1: 215, y1: 140, x2: 245, y2: 135 },
  { x1: 245, y1: 135, x2: 270, y2: 160 },
  { x1: 270, y1: 160, x2: 260, y2: 200 },
  { x1: 260, y1: 200, x2: 200, y2: 260 },
];

const STARS = [
  { cx: 200, cy: 260, r: 6, fill: 'white' },
  { cx: 140, cy: 200, r: 5, fill: '#3B82F6' },
  { cx: 130, cy: 160, r: 4, fill: '#10B981' },
  { cx: 155, cy: 135, r: 5, fill: '#F59E0B' },
  { cx: 185, cy: 140, r: 4, fill: '#8B5CF6' },
  { cx: 215, cy: 140, r: 4, fill: '#8B5CF6' },
  { cx: 245, cy: 135, r: 5, fill: '#F59E0B' },
  { cx: 270, cy: 160, r: 4, fill: '#10B981' },
  { cx: 260, cy: 200, r: 5, fill: '#3B82F6' },
];

const AMBIENT_STARS = [
  { x: SW * 0.12, y: SH * 0.10, size: 3, opacity: 0.4 },
  { x: SW * 0.80, y: SH * 0.08, size: 2, opacity: 0.3 },
  { x: SW * 0.08, y: SH * 0.35, size: 3, opacity: 0.25 },
  { x: SW * 0.90, y: SH * 0.32, size: 2, opacity: 0.35 },
  { x: SW * 0.25, y: SH * 0.06, size: 2, opacity: 0.2 },
  { x: SW * 0.85, y: SH * 0.22, size: 2.5, opacity: 0.3 },
  { x: SW * 0.06, y: SH * 0.58, size: 2, opacity: 0.18 },
  { x: SW * 0.92, y: SH * 0.55, size: 2.5, opacity: 0.22 },
  { x: SW * 0.30, y: SH * 0.88, size: 2, opacity: 0.2 },
  { x: SW * 0.72, y: SH * 0.90, size: 2.5, opacity: 0.25 },
  { x: SW * 0.50, y: SH * 0.04, size: 2, opacity: 0.18 },
  { x: SW * 0.18, y: SH * 0.78, size: 2, opacity: 0.15 },
  { x: SW * 0.82, y: SH * 0.75, size: 2, opacity: 0.2 },
  { x: SW * 0.40, y: SH * 0.94, size: 1.5, opacity: 0.12 },
  { x: SW * 0.60, y: SH * 0.03, size: 1.5, opacity: 0.15 },
  { x: SW * 0.15, y: SH * 0.50, size: 1.5, opacity: 0.12 },
];

interface Props {
  onComplete: () => void;
}

// Pixel position of the center red star in the SVG, mapped to LOGO_SIZE
const CENTER_X = (200 / 400) * LOGO_SIZE;
const CENTER_Y = (165 / 400) * LOGO_SIZE;

function AmbientStar({ x, y, size, opacity: baseOp, delay }: {
  x: number; y: number; size: number; opacity: number; delay: number;
}) {
  const op = useSharedValue(0);

  useEffect(() => {
    op.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(baseOp, { duration: 800 + delay * 0.5, easing: Easing.out(Easing.quad) }),
          withTiming(baseOp * 0.2, { duration: 1400 + delay * 0.3, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: x,
    top: y,
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: 'white',
    opacity: op.value,
  }));

  return <Animated.View style={style} />;
}

function PulseRing({ delay }: { delay: number }) {
  const scale = useSharedValue(0.25);
  const op = useSharedValue(0);

  const RING_SIZE = (120 / 400) * LOGO_SIZE;

  useEffect(() => {
    scale.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.25, { duration: 1 }),
        withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }),
      ),
      -1, false,
    ));
    op.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.2, { duration: 1 }),
        withTiming(0, { duration: 2200, easing: Easing.out(Easing.quad) }),
      ),
      -1, false,
    ));
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1,
    borderColor: '#EF4444',
    left: CENTER_X - RING_SIZE / 2,
    top: CENTER_Y - RING_SIZE / 2,
    opacity: op.value,
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={style} />;
}

export default function SplashScreen({ onComplete }: Props) {
  const starsOp = useSharedValue(0);
  const logoScale = useSharedValue(0.4);
  const logoOp = useSharedValue(0);
  const glowScale = useSharedValue(0.8);
  const glowOp = useSharedValue(0);
  const textY = useSharedValue(28);
  const textOp = useSharedValue(0);
  const tagOp = useSharedValue(0);
  const exitOp = useSharedValue(1);
  const exitScale = useSharedValue(1);

  const GLOW_SIZE = 24;

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);

    // Phase 1: Ambient stars fade in
    starsOp.value = withTiming(1, { duration: 600, easing: ease });

    // Phase 2: Logo scales up with spring
    logoOp.value = withDelay(300, withTiming(1, { duration: 500, easing: ease }));
    logoScale.value = withDelay(300, withSpring(1, { damping: 14, stiffness: 80, mass: 1 }));

    // Phase 3: Red glow breathes
    glowOp.value = withDelay(800, withRepeat(
      withSequence(
        withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.15, { duration: 700, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true,
    ));
    glowScale.value = withDelay(800, withRepeat(
      withSequence(
        withTiming(1.3, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.8, { duration: 700, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true,
    ));

    // Phase 5: Brand text slides up
    textOp.value = withDelay(1300, withTiming(1, { duration: 600, easing: ease }));
    textY.value = withDelay(1300, withTiming(0, { duration: 600, easing: ease }));

    // Phase 5b: Tagline fades in
    tagOp.value = withDelay(1700, withTiming(1, { duration: 500, easing: ease }));

    // Phase 6: Exit — scale up slightly + fade out
    exitScale.value = withDelay(3400, withTiming(1.12, { duration: 500, easing: Easing.in(Easing.cubic) }));
    exitOp.value = withDelay(3400, withTiming(0, {
      duration: 500,
      easing: Easing.in(Easing.cubic),
    }, () => {
      runOnJS(onComplete)();
    }));
  }, []);

  const starsStyle = useAnimatedStyle(() => ({ opacity: starsOp.value }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOp.value,
    transform: [{ scale: logoScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: '#EF4444',
    left: CENTER_X - GLOW_SIZE / 2,
    top: CENTER_Y - GLOW_SIZE / 2,
    opacity: glowOp.value,
    transform: [{ scale: glowScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOp.value,
    transform: [{ translateY: textY.value }],
  }));

  const tagStyle = useAnimatedStyle(() => ({ opacity: tagOp.value }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: exitOp.value,
    transform: [{ scale: exitScale.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Ambient twinkling stars */}
      <Animated.View style={[StyleSheet.absoluteFill, starsStyle]}>
        {AMBIENT_STARS.map((star, i) => (
          <AmbientStar key={i} {...star} delay={i * 60} />
        ))}
      </Animated.View>

      {/* Logo constellation */}
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        {/* Pulse rings — using Animated.View instead of SVG AnimatedCircle */}
        <PulseRing delay={1000} />
        <PulseRing delay={1500} />
        <PulseRing delay={2000} />

        {/* Red glow behind center star */}
        <Animated.View style={glowStyle} />

        {/* Static SVG constellation */}
        <Svg viewBox="0 0 400 400" width={LOGO_SIZE} height={LOGO_SIZE}>
          <Defs>
            <LinearGradient id="splashLine" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8} />
              <Stop offset="100%" stopColor="#10B981" stopOpacity={0.8} />
            </LinearGradient>
          </Defs>

          {/* Constellation lines */}
          {LINES.map((l, i) => (
            <Line
              key={i}
              x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="url(#splashLine)" strokeWidth={2}
            />
          ))}

          {/* Star nodes */}
          {STARS.map((s, i) => (
            <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} />
          ))}

          {/* Center red star */}
          <Circle cx={200} cy={165} r={7} fill="#EF4444" />
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
    backgroundColor: '#0F1020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  textWrap: {
    marginTop: 28,
    alignItems: 'center',
  },
  brandText: {
    fontSize: 32,
    fontWeight: '200',
    letterSpacing: 12,
    color: 'white',
    opacity: 0.9,
  },
  tagWrap: {
    marginTop: 8,
    alignItems: 'center',
  },
  tagline: {
    fontSize: 13,
    fontWeight: '300',
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'lowercase',
  },
});
