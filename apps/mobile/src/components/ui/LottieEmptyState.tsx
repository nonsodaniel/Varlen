import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { typography, spacing, radius } from '../../constants/theme';
import { PressableScale } from '../PressableScale';

let LottieView: any = null;
try {
  LottieView = require('lottie-react-native').default;
} catch {
  // lottie-react-native not available — will use fallback
}

interface LottieEmptyStateProps {
  animation?: any;
  fallbackIcon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  accentColor?: string;
  compact?: boolean;
}

export function LottieEmptyState({
  animation,
  fallbackIcon,
  title,
  description,
  actionLabel,
  onAction,
  accentColor,
  compact = false,
}: LottieEmptyStateProps) {
  const { colors } = useTheme();
  const accent = accentColor || colors.primary;
  const [lottieError, setLottieError] = useState(false);
  const showLottie = LottieView && animation && !lottieError;
  const iconSize = compact ? 80 : 120;

  return (
    <View style={styles.container}>
      {showLottie ? (
        <View style={{ width: iconSize, height: iconSize }}>
          <LottieView
            source={animation}
            autoPlay
            loop
            style={{ width: iconSize, height: iconSize }}
            onAnimationFailure={() => setLottieError(true)}
          />
        </View>
      ) : (
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: accent + '14',
              width: compact ? 48 : 56,
              height: compact ? 48 : 56,
              borderRadius: compact ? 24 : 28,
            },
          ]}
        >
          <Ionicons
            name={fallbackIcon}
            size={compact ? 22 : 26}
            color={accent}
          />
        </View>
      )}

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {description}
      </Text>

      {actionLabel && onAction && (
        <PressableScale
          onPress={onAction}
          style={[styles.actionBtn, { backgroundColor: accent }]}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.actionBtnText}>{actionLabel}</Text>
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.headline,
    textAlign: 'center',
  },
  description: {
    ...typography.callout,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    marginTop: spacing.xs,
  },
  actionBtnText: {
    ...typography.subhead,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
