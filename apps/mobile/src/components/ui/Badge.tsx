import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { radius, spacing } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({ label, variant = 'default', size = 'sm', style }: BadgeProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const variantColors = {
    default: { bg: colors.borderLight, text: colors.textSecondary },
    primary: { bg: colors.primaryLight, text: colors.primary },
    success: { bg: colors.successLight, text: colors.success },
    warning: { bg: colors.warningLight, text: colors.warning },
    error: { bg: colors.errorLight, text: colors.error },
  };

  const { bg, text } = variantColors[variant];

  return (
    <View
      style={[styles.badge, size === 'md' && styles.md, { backgroundColor: bg }, style]}
      accessible={true}
      accessibilityLabel={label}
      accessibilityRole="text"
    >
      <Text style={[styles.text, size === 'md' && styles.textMd, { color: text }]}>
        {label}
      </Text>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  md: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  textMd: {
    fontSize: 12,
  },
});
