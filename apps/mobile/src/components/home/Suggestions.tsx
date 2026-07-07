import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radius, shadows } from '../../constants/theme';

interface Suggestion {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
  bg: string;
  route: string;
  params?: Record<string, string>;
}

interface SuggestionsProps {
  suggestions: Suggestion[];
}

export function Suggestions({ suggestions }: SuggestionsProps) {
  const router = useRouter();

  if (suggestions.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={16} color={colors.warning} />
        <Text style={styles.headerText}>Suggested for you</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {suggestions.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={styles.card}
            onPress={() =>
              s.params
                ? router.push({ pathname: s.route as any, params: s.params })
                : router.push(s.route as any)
            }
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: s.bg }]}>
              <Ionicons name={s.icon} size={20} color={s.color} />
            </View>
            <Text style={styles.title} numberOfLines={1}>{s.title}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>{s.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const CARD_WIDTH = 140;

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  headerText: {
    ...typography.subhead,
    color: colors.textSecondary,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.soft,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.subhead,
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.caption1,
    color: colors.textTertiary,
    lineHeight: 14,
  },
});
