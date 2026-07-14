import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { haptics } from '../../hooks/useHaptics';
import { typography, spacing, radius } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { InsightCard as InsightCardType } from '../../hooks/useInsights';

interface InsightCardProps {
  insight: InsightCardType;
  onDismiss: (id: string) => void;
}

export function InsightCard({ insight, onDismiss }: InsightCardProps) {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() =>
        insight.params
          ? router.push({ pathname: insight.route as any, params: insight.params })
          : router.push(insight.route as any)
      }
    >
      <View style={[styles.accent, { backgroundColor: insight.color }]} />
      <View style={[styles.iconWrap, { backgroundColor: insight.bg }]}>
        <Ionicons name={insight.icon as any} size={20} color={insight.color} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{insight.title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>{insight.subtitle}</Text>
      </View>
      <TouchableOpacity
        style={styles.dismissBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        onPress={(e) => {
          e.stopPropagation();
          haptics.light();
          onDismiss(insight.id);
        }}
      >
        <Ionicons name="close" size={16} color={colors.textTertiary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

interface InsightsSectionProps {
  insights: InsightCardType[];
  dismissedIds: Set<string>;
  onDismiss: (id: string) => void;
}

export function InsightsSection({ insights, dismissedIds, onDismiss }: InsightsSectionProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, {} as any), [colors]);

  const visible = insights.filter((i) => !dismissedIds.has(i.id)).slice(0, 5);

  if (visible.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Ionicons name="sparkles-outline" size={16} color="#F59E0B" />
        <Text style={styles.headerText}>Daily Briefing</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{visible.length}</Text>
        </View>
      </View>
      {visible.map((insight) => (
        <InsightCard key={insight.id} insight={insight} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  section: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  headerText: {
    ...typography.subhead,
    color: colors.textSecondary,
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countText: {
    ...typography.caption2,
    color: colors.warning,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...(shadows?.soft ?? {}),
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.subhead,
    color: colors.text,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  dismissBtn: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
});
