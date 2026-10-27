import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { AnimatedCardEntrance } from '../src/components/AnimatedCardEntrance';
import { PressableScale } from '../src/components/PressableScale';
import { useChallenges } from '../src/hooks/useChallenges';

export default function ChallengesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const challenges = useChallenges();

  const active = challenges.filter((c) => c.progress < c.target);
  const completed = challenges.filter((c) => c.progress >= c.target);

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <PressableScale onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </PressableScale>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Challenges</Text>
          <Text style={styles.headerSubtitle}>Unlocked by your daily activity</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView keyboardDismissMode="on-drag"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {challenges.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="trophy-outline" size={36} color="#F59E0B" />
            </View>
            <Text style={styles.emptyTitle}>No challenges yet</Text>
            <Text style={styles.emptyDesc}>
              Start adding tasks, habits, and meals to unlock challenges.
            </Text>
          </View>
        )}

        {active.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>ACTIVE</Text>
            {active.map((challenge, i) => {
              const pct = Math.round((challenge.progress / challenge.target) * 100);
              return (
                <AnimatedCardEntrance key={challenge.id} index={i}>
                  <View style={styles.card}>
                    <LinearGradient
                      colors={[challenge.color + '15', challenge.bg]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.cardGradient}
                    />
                    <View style={styles.cardRow}>
                      <Text style={styles.cardEmoji}>{challenge.emoji}</Text>
                      <View style={styles.cardContent}>
                        <Text style={styles.cardTitle}>{challenge.title}</Text>
                        <Text style={styles.cardDesc}>{challenge.description}</Text>
                        <View style={styles.progressRow}>
                          <View style={styles.progressTrack}>
                            <View
                              style={[
                                styles.progressFill,
                                {
                                  width: `${Math.min(pct, 100)}%`,
                                  backgroundColor: challenge.color,
                                },
                              ]}
                            />
                          </View>
                          <Text style={[styles.progressText, { color: challenge.color }]}>
                            {challenge.progress}/{challenge.target} {challenge.unit}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </AnimatedCardEntrance>
              );
            })}
          </>
        )}

        {completed.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>
              COMPLETED
            </Text>
            {completed.map((challenge, i) => (
              <AnimatedCardEntrance
                key={challenge.id}
                index={active.length + i}
              >
                <View style={[styles.card, styles.cardCompleted]}>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardEmoji}>{challenge.emoji}</Text>
                    <View style={styles.cardContent}>
                      <View style={styles.completedRow}>
                        <Text style={styles.cardTitle}>{challenge.title}</Text>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#10B981"
                        />
                      </View>
                      <Text style={[styles.cardDesc, { color: colors.textTertiary }]}>
                        {challenge.description}
                      </Text>
                    </View>
                  </View>
                </View>
              </AnimatedCardEntrance>
            ))}
          </>
        )}

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typography.headline, color: colors.text, textAlign: 'center' },
  headerSubtitle: { fontSize: 11, color: colors.textTertiary, textAlign: 'center', marginTop: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  sectionLabel: {
    ...typography.caption1,
    color: colors.textTertiary,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.soft,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  cardCompleted: {
    opacity: 0.7,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  cardEmoji: {
    fontSize: 32,
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.headline,
    color: colors.text,
    fontSize: 15,
    marginBottom: 2,
  },
  cardDesc: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    ...typography.caption2,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
