import React, { forwardRef, useMemo } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { typography, radius, spacing } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, containerStyle, style, ...props }, ref) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <TextInput
          ref={ref}
          style={[styles.input, error && styles.inputError, style]}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.primary}
          {...props}
        />
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }
);

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.subhead,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    height: 52,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  inputError: {
    borderWidth: 1,
    borderColor: colors.error,
  },
  error: {
    ...typography.caption1,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
