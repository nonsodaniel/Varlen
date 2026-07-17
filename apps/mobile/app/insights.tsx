import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { usePremiumGate } from '../src/hooks/usePremiumGate';
interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
}

const insights: Insight[] = [];

const typeConfig: Record<string, { color: string; icon: string }> = {
  achievement: { color: colors.success, icon: 'trophy-outline' },
  tip: { color: colors.primary, icon: 'bulb-outline' },
  reminder: { color: '#EC4899', icon: 'flag-outline' },
};

export default function InsightsScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { requirePremium } = usePremiumGate();

  useFocusEffect(useCallback(() => { requirePremium('budgets_insights'); }, [requirePremium]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Insights</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {insights.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="bulb-outline" size={48} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No insights yet</Text>
            <Text style={styles.emptyDesc}>
              Insights will appear here as you use the app. Track your habits, log wellness, and complete tasks to unlock personalized tips and achievements.
            </Text>
          </View>
        ) : (
          insights.map((insight) => {
            const config = typeConfig[insight.type] || typeConfig.tip;

            return (
              <View key={insight.id} style={styles.card}>
                <View style={[styles.accentBar, { backgroundColor: config.color }]} />
                <View style={styles.cardInner}>
                  <View style={[styles.iconCircle, { backgroundColor: config.color + '18' }]}>
                    <Ionicons name={config.icon as any} size={20} color={config.color} />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{insight.title}</Text>
                    <Text style={styles.cardDescription}>{insight.description}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  accentBar: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    ...typography.body,
    color: colors.textSecondary,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    ...typography.title2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyDesc: {
    ...typography.callout,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
