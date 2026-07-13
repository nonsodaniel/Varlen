import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface EmojiPickerProps {
  options: string[];
  selected: string;
  onSelect: (emoji: string) => void;
  columns?: number;
}

export function EmojiPicker({ options, selected, onSelect, columns = 6 }: EmojiPickerProps) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  return (
    <View style={[styles.grid, { maxWidth: columns * 56 }]}>
      {options.map((emoji) => (
        <TouchableOpacity
          key={emoji}
          style={[
            styles.circle,
            selected === emoji && styles.circleActive,
          ]}
          onPress={() => onSelect(emoji)}
          activeOpacity={0.7}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Text style={styles.emoji}>{emoji}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  circleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  emoji: {
    fontSize: 22,
  },
});
