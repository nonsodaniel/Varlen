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
  Path,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

const { width: SW, height: SH } = Dimensions.get('window');
const LOGO_SIZE = Math.min(SW * 0.55, 220);

const ROOF_LINES = [
  { x1: 200, y1: 88, x2: 103, y2: 200 },
  { x1: 200, y1: 88, x2: 297, y2: 200 },
];

const HOUSE_LINES = [
  { x1: 103, y1: 200, x2: 297, y2: 200 },
  { x1: 103, y1: 200, x2: 103, y2: 313 },
  { x1: 297, y1: 200, x2: 297, y2: 313 },
  { x1: 103, y1: 313, x2: 297, y2: 313 },
  { x1: 176, y1: 313, x2: 176, y2: 262 },
  { x1: 224, y1: 313, x2: 224, y2: 262 },
  { x1: 176, y1: 262, x2: 224, y2: 262 },
];

const NODES = [
  { cx: 103, cy: 200, r: 9,   fill: '#3B82F6' },
  { cx: 297, cy: 200, r: 9,   fill: '#EC4899' },
  { cx: 103, cy: 313, r: 8.5, fill: '#10B981' },
  { cx: 297, cy: 313, r: 8.5, fill: '#F59E0B' },
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

// Roof peak position in the tight viewBox (82,65 236x258) mapped to LOGO_SIZE
// Peak is at (200, 88) in 400x400 space → within viewBox: x=(200-82)/236, y=(88-65)/258
const PEAK_REL_X = (200 - 82) / 236;
const PEAK_REL_Y = (88 - 65) / 258;
const CENTER_X = PEAK_REL_X * LOGO_SIZE;
const CENTER_Y = PEAK_REL_Y * LOGO_SIZE;

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

  const RING_SIZE = (80 / 400) * LOGO_SIZE;

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
        withTiming(0.35, { duration: 1 }),
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
    borderColor: '#60A5FA',
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

  const GLOW_SIZE = 28;

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);

    starsOp.value = withTiming(1, { duration: 600, easing: ease });

    logoOp.value = withDelay(300, withTiming(1, { duration: 500, easing: ease }));
    logoScale.value = withDelay(300, withSpring(1, { damping: 14, stiffness: 80, mass: 1 }));

    glowOp.value = withDelay(800, withRepeat(
      withSequence(
        withTiming(0.5, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.15, { duration: 700, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true,
    ));
    glowScale.value = withDelay(800, withRepeat(
      withSequence(
        withTiming(1.4, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.8, { duration: 700, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true,
    ));

    textOp.value = withDelay(1300, withTiming(1, { duration: 600, easing: ease }));
    textY.value = withDelay(1300, withTiming(0, { duration: 600, easing: ease }));

    tagOp.value = withDelay(1700, withTiming(1, { duration: 500, easing: ease }));

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
    backgroundColor: '#60A5FA',
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
      <Animated.View style={[StyleSheet.absoluteFill, starsStyle]}>
        {AMBIENT_STARS.map((star, i) => (
          <AmbientStar key={i} {...star} delay={i * 60} />
        ))}
      </Animated.View>

      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <PulseRing delay={1000} />
        <PulseRing delay={1500} />
        <PulseRing delay={2000} />

        {/* Blue glow behind roof peak */}
        <Animated.View style={glowStyle} />

        <Svg viewBox="82 65 236 258" width={LOGO_SIZE} height={LOGO_SIZE}>
          <Defs>
            <LinearGradient id="splashRoof" x1="82" y1="65" x2="318" y2="323" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#60A5FA" stopOpacity={0.95} />
              <Stop offset="100%" stopColor="#34D399" stopOpacity={0.95} />
            </LinearGradient>
            <LinearGradient id="splashWall" x1="103" y1="200" x2="297" y2="313" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#34D399" stopOpacity={0.9} />
              <Stop offset="100%" stopColor="#3B82F6" stopOpacity={0.9} />
            </LinearGradient>
          </Defs>

          {ROOF_LINES.map((l, i) => (
            <Line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="url(#splashRoof)" strokeWidth={3} strokeLinecap="round" />
          ))}

          {HOUSE_LINES.map((l, i) => (
            <Line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="url(#splashWall)" strokeWidth={2} strokeLinecap="round" opacity={0.65} />
          ))}

          {NODES.map((n, i) => (
            <Circle key={i} cx={n.cx} cy={n.cy} r={n.r} fill={n.fill} />
          ))}

          <Path
            d="M200,232 C200,232 180,217 180,204 C180,196 190,189 200,199 C210,189 220,196 220,204 C220,217 200,232 200,232 Z"
            fill="#F472B6"
          />

          <Circle cx={200} cy={88} r={16} fill="#60A5FA" />
          <Circle cx={200} cy={88} r={9} fill="white" />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.textWrap, textStyle]}>
        <Text style={styles.brandText}>SIVEN{'\u039B'}</Text>
      </Animated.View>

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
