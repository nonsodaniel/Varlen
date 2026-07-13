import React from 'react';
import { View, Platform, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';
import { radius } from '../../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  style?: ViewStyle;
  borderRadius?: number;
}

export function GlassCard({
  children,
  intensity = 40,
  tint,
  style,
  borderRadius = radius.xl,
}: GlassCardProps) {
  const { isDark } = useTheme();
  const resolvedTint = tint ?? (isDark ? 'dark' : 'light');

  const bgFallback = isDark
    ? 'rgba(28, 28, 30, 0.78)'
    : 'rgba(255, 255, 255, 0.78)';

  const borderColor = isDark
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(255, 255, 255, 0.25)';

  return (
    <View style={[{ borderRadius, overflow: 'hidden' }, style]}>
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={intensity}
          tint={resolvedTint}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: Platform.OS === 'ios'
              ? isDark
                ? 'rgba(28, 28, 30, 0.45)'
                : 'rgba(255, 255, 255, 0.45)'
              : bgFallback,
          },
        ]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius,
            borderWidth: 1,
            borderColor,
          },
        ]}
      />
      {children}
    </View>
  );
}
