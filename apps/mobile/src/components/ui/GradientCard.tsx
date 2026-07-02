import React from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radius } from '../../constants/theme';

interface GradientCardProps {
  colors: readonly string[] | string[];
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  borderRadius?: number;
}

export function GradientCard({
  colors: gradientColors,
  style,
  children,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  borderRadius = radius.xl,
}: GradientCardProps) {
  return (
    <LinearGradient
      colors={gradientColors as [string, string, ...string[]]}
      start={start}
      end={end}
      style={[{ borderRadius, overflow: 'hidden' }, style]}
    >
      {children}
    </LinearGradient>
  );
}
