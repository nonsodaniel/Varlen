import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '../src/constants/theme';
import { mockDateIdeas } from '../src/data/mock';

const categoryAccents: Record<string, { color: string; bg: string }> = {
  romantic: { color: '#EC4899', bg: '#FCE7F3' },
  adventure: { color: '#10B981', bg: '#D1FAE5' },
  chill: { color: '#3B82F6', bg: '#DBEAFE' },
  foodie: { color: '#F59E0B', bg: '#FEF3C7' },
};

export default function DateIdeasScreen() {
  const router = useRouter();

  const handleSurpriseMe = () => {
    const randomIdea = mockDateIdeas[Math.floor(Math.random() * mockDateIdeas.length)];
    const details = [
      `Category: ${randomIdea.category}`,
      `Estimated cost: $${randomIdea.estimatedCost ?? 0}`,
      `Location: ${randomIdea.location || 'Anywhere'}`,
      randomIdea.tried ? 'You\'ve tried this one!' : 'Haven\'t tried yet',
    ].join('\n');
    Alert.alert(`\u2728 ${randomIdea.title}`, details);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Date Ideas</Text>
        <View style={styles.heartIcon}>
          <Ionicons name="heart" size={20} color={colors.primary} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {mockDateIdeas.map((idea) => {
          const accent = categoryAccents[idea.category] || { color: '#6B7280', bg: '#E2E8F0' };

          return (
            <View key={idea.id} style={styles.card}>
              <View style={[styles.cardAccent, { backgroundColor: accent.color }]} />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{idea.title}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: accent.bg }]}>
                    <Text style={[styles.badgeText, { color: accent.color }]}>{idea.category}</Text>
                  </View>
                  {idea.estimatedCost !== undefined && (
                    <View style={[styles.badge, { backgroundColor: accent.bg }]}>
                      <Text style={[styles.badgeText, { color: accent.color }]}>
                        ${idea.estimatedCost}
                      </Text>
                    </View>
                  )}
                </View>
                {idea.location && (
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={13} color={colors.textTertiary} />
                    <Text style={styles.cardLocation}>{idea.location}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* Surprise Me Button */}
        <TouchableOpacity style={styles.surpriseBtn} onPress={handleSurpriseMe} activeOpacity={0.8}>
          <Ionicons name="sparkles" size={18} color={colors.textInverse} />
          <Text style={styles.surpriseBtnText}>Surprise me!</Text>
        </TouchableOpacity>

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  heartIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardAccent: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: spacing.xl,
  },
  cardTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeText: {
    ...typography.caption1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardLocation: {
    ...typography.callout,
    color: colors.textSecondary,
  },

  // Surprise button
  surpriseBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    ...shadows.md,
  },
  surpriseBtnText: {
    ...typography.headline,
    color: colors.textInverse,
  },
});
