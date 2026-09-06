import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { typography, spacing, radius } from '../../constants/theme';

interface QuickPromptsProps {
  onSelect: (prompt: string) => void;
  onPlan?: () => void;
}

type Category = 'all' | 'create' | 'planning' | 'dates' | 'meals' | 'money' | 'wellness';

interface PromptItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: Category[];
}

const CATEGORIES: { key: Category; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'create', label: 'Create', icon: 'add-circle-outline' },
  { key: 'planning', label: 'Planning', icon: 'calendar-outline' },
  { key: 'dates', label: 'Dates', icon: 'heart-outline' },
  { key: 'meals', label: 'Meals', icon: 'restaurant-outline' },
  { key: 'money', label: 'Money', icon: 'wallet-outline' },
  { key: 'wellness', label: 'Wellness', icon: 'fitness-outline' },
];

const PROMPTS: PromptItem[] = [
  // Create
  { label: 'Add 3 tasks for today', icon: 'checkbox-outline', category: ['create'] },
  { label: 'Plan meals for this week', icon: 'restaurant-outline', category: ['create', 'meals'] },
  { label: 'Create a daily workout habit', icon: 'fitness-outline', category: ['create', 'wellness'] },
  { label: 'Schedule a dinner party event', icon: 'calendar-outline', category: ['create', 'dates'] },
  { label: 'Add a savings goal for me', icon: 'trophy-outline', category: ['create', 'money'] },
  { label: 'Create a morning routine habit', icon: 'sunny-outline', category: ['create', 'wellness'] },
  { label: 'Add tasks for cleaning the house', icon: 'home-outline', category: ['create'] },
  { label: 'Log an expense for groceries', icon: 'card-outline', category: ['create', 'money'] },
  // Planning
  { label: 'Help me plan my week', icon: 'calendar-outline', category: ['planning'] },
  { label: "What's on my schedule today?", icon: 'today-outline', category: ['planning'] },
  { label: 'What tasks am I behind on?', icon: 'checkbox-outline', category: ['planning'] },
  { label: 'Help me organize my priorities', icon: 'list-outline', category: ['planning'] },
  // Dates
  { label: 'Plan a date night for us', icon: 'heart-outline', category: ['dates'] },
  { label: 'Suggest a fun weekend activity', icon: 'sparkles-outline', category: ['dates'] },
  { label: 'Budget-friendly date ideas', icon: 'pricetag-outline', category: ['dates'] },
  { label: 'Plan a surprise for my partner', icon: 'gift-outline', category: ['dates'] },
  // Meals
  { label: 'Suggest a meal for tonight', icon: 'restaurant-outline', category: ['meals'] },
  { label: 'Plan meals for this week', icon: 'nutrition-outline', category: ['meals'] },
  { label: 'Quick dinner ideas under 30 min', icon: 'timer-outline', category: ['meals'] },
  { label: 'Healthy meal prep suggestions', icon: 'leaf-outline', category: ['meals'] },
  // Money
  { label: "How's my budget looking?", icon: 'wallet-outline', category: ['money'] },
  { label: 'Help me save more this month', icon: 'trending-up-outline', category: ['money'] },
  { label: 'Review my spending habits', icon: 'pie-chart-outline', category: ['money'] },
  { label: 'Suggest ways to cut expenses', icon: 'cut-outline', category: ['money'] },
  // Wellness
  { label: 'How are my habits going?', icon: 'repeat-outline', category: ['wellness'] },
  { label: 'Suggest a self-care routine', icon: 'heart-circle-outline', category: ['wellness'] },
  { label: 'Help me improve my sleep', icon: 'moon-outline', category: ['wellness'] },
  { label: 'Create a morning routine for me', icon: 'sunny-outline', category: ['wellness'] },
];

export default function QuickPrompts({ onSelect, onPlan }: QuickPromptsProps) {
  const { colors, isDark } = useTheme();
  const [activeCategory, setActiveCategory] = useState<Category>('all');

  const filteredPrompts = activeCategory === 'all'
    ? PROMPTS.slice(0, 8)
    : PROMPTS.filter((p) => p.category.includes(activeCategory));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.aiIconWrap, { backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : '#EDE9FE' }]}>
          <Ionicons name="sparkles" size={24} color="#8B5CF6" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          What do you need?
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Create tasks, plan meals, schedule events — just ask
        </Text>
      </View>

      {/* Plan CTA */}
      {onPlan && (
        <TouchableOpacity
          style={[styles.planCta, { backgroundColor: isDark ? 'rgba(139,92,246,0.12)' : '#F5F3FF', borderColor: isDark ? 'rgba(139,92,246,0.3)' : '#DDD6FE' }]}
          onPress={onPlan}
          activeOpacity={0.8}
        >
          <View style={styles.planCtaLeft}>
            <Ionicons name="map-outline" size={20} color="#8B5CF6" />
            <View>
              <Text style={[styles.planCtaTitle, { color: '#8B5CF6' }]}>Plan with Smart Assistant</Text>
              <Text style={[styles.planCtaSubtitle, { color: isDark ? '#A78BFA' : '#7C3AED' }]}>
                Date night, meals, weekends & more
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8B5CF6" />
        </TouchableOpacity>
      )}

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
        style={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isActive ? '#8B5CF6' : isDark ? colors.elevated : colors.card,
                  borderColor: isActive ? '#8B5CF6' : colors.border,
                },
              ]}
              onPress={() => setActiveCategory(cat.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={cat.icon}
                size={14}
                color={isActive ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.categoryLabel,
                  { color: isActive ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Prompts grid */}
      <View style={styles.grid}>
        {filteredPrompts.map((prompt) => (
          <TouchableOpacity
            key={prompt.label}
            style={[
              styles.chip,
              {
                backgroundColor: isDark ? colors.elevated : colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => onSelect(prompt.label)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={prompt.icon}
              size={18}
              color="#8B5CF6"
              style={styles.chipIcon}
            />
            <Text
              style={[styles.chipLabel, { color: colors.text }]}
              numberOfLines={2}
            >
              {prompt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  aiIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  planCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  planCtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  planCtaTitle: {
    ...typography.subhead,
    fontWeight: '700',
  },
  planCtaSubtitle: {
    ...typography.footnote,
    marginTop: 2,
  },
  categoryScroll: {
    flexGrow: 0,
    marginBottom: spacing.lg,
  },
  categoryRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  categoryLabel: {
    ...typography.caption1,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    maxWidth: 400,
    alignSelf: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    width: '47%',
  },
  chipIcon: {
    marginRight: spacing.sm,
  },
  chipLabel: {
    ...typography.callout,
    flex: 1,
  },
});
