import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { haptics } from '../../hooks/useHaptics';
import { spacing, radius } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface ChipData {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  color?: string;
  route: string;
  params?: Record<string, string>;
}

interface MoreChipsProps {
  chips: ChipData[];
}

export function MoreChips({ chips }: MoreChipsProps) {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  if (chips.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {chips.map((chip, i) => (
          <TouchableOpacity
            key={i}
            style={styles.chip}
            onPress={() => {
              haptics.light();
              chip.params
                ? router.push({ pathname: chip.route as any, params: chip.params })
                : router.push(chip.route as any);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name={chip.icon} size={16} color={chip.color || colors.primary} />
            <Text style={styles.chipText} numberOfLines={1}>
              {chip.value ? `${chip.value}` : chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'visible' as const,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 4,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    ...shadows.sm,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
});
