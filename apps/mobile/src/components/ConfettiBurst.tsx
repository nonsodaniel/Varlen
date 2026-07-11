import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PARTICLE_COUNT = 30;
const DURATION = 1500;

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface ParticleProps {
  color: string;
  startX: number;
  startY: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  delay: number;
  size: number;
}

function Particle({ color, startX, startY, velocityX, velocityY, rotation, delay, size }: ParticleProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const x = startX + velocityX * p;
    const y = startY + velocityY * p + 400 * p * p; // gravity
    const opacity = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    const rotate = rotation * p;
    return {
      position: 'absolute',
      left: x,
      top: y,
      width: size,
      height: size,
      borderRadius: size > 6 ? 2 : size / 2,
      backgroundColor: color,
      opacity,
      transform: [{ rotate: `${rotate}deg` }, { scale: 1 - p * 0.3 }],
    };
  });

  return <Animated.View style={style} />;
}

interface ConfettiBurstProps {
  trigger: boolean;
  onComplete?: () => void;
}

export function ConfettiBurst({ trigger, onComplete }: ConfettiBurstProps) {
  const [particles, setParticles] = useState<ParticleProps[]>([]);

  useEffect(() => {
    if (!trigger) {
      setParticles([]);
      return;
    }

    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT * 0.35;

    const newParticles: ParticleProps[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      color: COLORS[i % COLORS.length],
      startX: centerX + (Math.random() - 0.5) * 40,
      startY: centerY + (Math.random() - 0.5) * 20,
      velocityX: (Math.random() - 0.5) * 300,
      velocityY: -(Math.random() * 200 + 100),
      rotation: (Math.random() - 0.5) * 720,
      delay: Math.random() * 150,
      size: Math.random() > 0.5 ? 8 : 5,
    }));

    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, DURATION + 200);

    return () => clearTimeout(timer);
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Particle key={i} {...p} />
      ))}
    </View>
  );
}
