import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from './Button';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  accentColor?: string;
  compact?: boolean;
  emoji?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  accentColor,
  compact = false,
  emoji,
}: EmptyStateProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const tint = accentColor || colors.primary;
  const tintBg = accentColor ? `${accentColor}18` : colors.primaryLight;

  return (
    <View
      style={[styles.container, compact && styles.containerCompact]}
      accessible={true}
      accessibilityLabel={`${title}. ${description}`}
    >
      <View style={[styles.iconContainer, compact && styles.iconContainerCompact, { backgroundColor: tintBg }]}>
        {emoji ? (
          <Text style={styles.emoji}>{emoji}</Text>
        ) : (
          <Ionicons name={icon} size={compact ? 24 : 36} color={tint} />
        )}
      </View>
      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      <Text style={[styles.description, compact && styles.descriptionCompact]}>{description}</Text>
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} variant="secondary" size="sm" style={styles.button} />
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing['4xl'],
  },
  containerCompact: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconContainerCompact: {
    width: 48,
    height: 48,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  emoji: {
    fontSize: 28,
  },
  title: {
    ...typography.title3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  titleCompact: {
    fontSize: 15,
    fontWeight: '600',
  },
  description: {
    ...typography.callout,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  descriptionCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    marginTop: spacing.lg,
  },
});
