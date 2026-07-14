import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padded?: boolean;
  variant?: 'default' | 'elevated' | 'outlined';
  navigable?: boolean;
}

export function Card({
  children,
  style,
  onPress,
  padded = true,
  variant = 'default',
  navigable = false,
}: CardProps) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const cardStyle = [
    styles.card,
    variant === 'elevated' && styles.elevated,
    variant === 'outlined' && styles.outlined,
    padded && styles.padded,
    navigable && onPress && styles.navigable,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={cardStyle} accessibilityRole="button">
        <View style={styles.cardInner}>
          <View style={styles.cardContent}>{children}</View>
          {navigable && (
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={styles.chevron} />
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  elevated: {
    ...shadows.md,
  },
  outlined: {
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  padded: {
    padding: spacing.xl,
  },
  navigable: {
    paddingRight: spacing.md,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  chevron: {
    marginLeft: spacing.sm,
  },
});
