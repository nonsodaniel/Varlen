import React, { useEffect } from 'react';
import { View, Dimensions, StyleSheet, Text } from 'react-native';
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
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Line,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { width: SW, height: SH } = Dimensions.get('window');
const LOGO_SIZE = Math.min(SW * 0.55, 220);

// Constellation data matching logo-4-final
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
          withTiming(baseOp * 0.2, { duration: 1400 + delay * 0.3, easing: Easing.inOut(Easing.sine) }),
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

export default function SplashScreen({ onComplete }: Props) {
  // --- Shared values ---
  // Stars background
  const starsOp = useSharedValue(0);
  // Logo
  const logoScale = useSharedValue(0.4);
  const logoOp = useSharedValue(0);
  // Pulse rings
  const pulse1R = useSharedValue(15);
  const pulse1Op = useSharedValue(0);
  const pulse2R = useSharedValue(30);
  const pulse2Op = useSharedValue(0);
  const pulse3R = useSharedValue(45);
  const pulse3Op = useSharedValue(0);
  // Red center glow
  const glowR = useSharedValue(10);
  const glowOp = useSharedValue(0);
  // Text
  const textY = useSharedValue(28);
  const textOp = useSharedValue(0);
  // Tagline
  const tagOp = useSharedValue(0);
  // Exit
  const exitOp = useSharedValue(1);
  const exitScale = useSharedValue(1);

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
        withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.sine) }),
        withTiming(0.15, { duration: 700, easing: Easing.inOut(Easing.sine) }),
      ),
      -1, true,
    ));
    glowR.value = withDelay(800, withRepeat(
      withSequence(
        withTiming(16, { duration: 700, easing: Easing.inOut(Easing.sine) }),
        withTiming(12, { duration: 700, easing: Easing.inOut(Easing.sine) }),
      ),
      -1, true,
    ));

    // Phase 4: Pulse rings (staggered, repeating)
    const startPulse = (
      rVal: Animated.SharedValue<number>,
      opVal: Animated.SharedValue<number>,
      startR: number,
      endR: number,
      delay: number,
    ) => {
      rVal.value = withDelay(delay, withRepeat(
        withSequence(
          withTiming(startR, { duration: 1 }),
          withTiming(endR, { duration: 2200, easing: Easing.out(Easing.quad) }),
        ),
        -1, false,
      ));
      opVal.value = withDelay(delay, withRepeat(
        withSequence(
          withTiming(0.2, { duration: 1 }),
          withTiming(0, { duration: 2200, easing: Easing.out(Easing.quad) }),
        ),
        -1, false,
      ));
    };

    startPulse(pulse1R, pulse1Op, 15, 60, 1000);
    startPulse(pulse2R, pulse2Op, 15, 60, 1500);
    startPulse(pulse3R, pulse3Op, 15, 60, 2000);

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

  // --- Animated styles ---
  const starsStyle = useAnimatedStyle(() => ({ opacity: starsOp.value }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOp.value,
    transform: [{ scale: logoScale.value }],
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

  // --- Animated SVG props ---
  const pulse1Props = useAnimatedProps(() => ({
    r: pulse1R.value,
    opacity: pulse1Op.value,
  }));
  const pulse2Props = useAnimatedProps(() => ({
    r: pulse2R.value,
    opacity: pulse2Op.value,
  }));
  const pulse3Props = useAnimatedProps(() => ({
    r: pulse3R.value,
    opacity: pulse3Op.value,
  }));
  const glowProps = useAnimatedProps(() => ({
    r: glowR.value,
    opacity: glowOp.value,
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
        <Svg viewBox="0 0 400 400" width={LOGO_SIZE} height={LOGO_SIZE}>
          <Defs>
            <LinearGradient id="splashLine" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8} />
              <Stop offset="100%" stopColor="#10B981" stopOpacity={0.8} />
            </LinearGradient>
          </Defs>

          {/* Pulse rings from center */}
          <AnimatedCircle
            cx={200} cy={165} fill="none"
            stroke="#EF4444" strokeWidth={0.8}
            animatedProps={pulse1Props}
          />
          <AnimatedCircle
            cx={200} cy={165} fill="none"
            stroke="#EF4444" strokeWidth={0.5}
            animatedProps={pulse2Props}
          />
          <AnimatedCircle
            cx={200} cy={165} fill="none"
            stroke="#EF4444" strokeWidth={0.3}
            animatedProps={pulse3Props}
          />

          {/* Red glow behind center star */}
          <AnimatedCircle
            cx={200} cy={165} fill="#EF4444"
            animatedProps={glowProps}
          />

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
        <Text style={styles.brandText}>V{'\u039B'}LEN</Text>
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F1020',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
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
