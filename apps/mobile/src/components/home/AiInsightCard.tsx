import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { typography, spacing, radius } from '../../constants/theme';
import { useAiStore, AiSuggestion } from '../../stores/aiStore';

export default function AiInsightCard() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const suggestions = useAiStore((s) => s.suggestions);
  const dismissSuggestion = useAiStore((s) => s.dismissSuggestion);

  const topSuggestions = suggestions.slice(0, 2);

  if (topSuggestions.length === 0) return null;

  const getTypeIcon = (type: AiSuggestion['type']): string => {
    switch (type) {
      case 'reminder': return 'alarm-outline';
      case 'tip': return 'bulb-outline';
      case 'achievement': return 'trophy-outline';
      case 'insight': return 'analytics-outline';
      default: return 'bulb-outline';
    }
  };

  const getTypeColor = (type: AiSuggestion['type']): string => {
    switch (type) {
      case 'reminder': return '#F59E0B';
      case 'tip': return '#3B82F6';
      case 'achievement': return '#10B981';
      case 'insight': return '#8B5CF6';
      default: return '#8B5CF6';
    }
  };

  const handleSuggestionPress = (sug: AiSuggestion) => {
    const prompt = sug.prompt || `Tell me more about: ${sug.title}`;
    router.push({ pathname: '/ai-chat', params: { prompt } } as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : '#F5F3FF' }]}>
          <Ionicons name="bulb-outline" size={13} color="#8B5CF6" />
        </View>
        <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>
          Tips for you
        </Text>
      </View>

      {topSuggestions.map((sug) => {
        const typeColor = getTypeColor(sug.type);
        return (
          <TouchableOpacity
            key={sug.id}
            style={[
              styles.card,
              {
                backgroundColor: isDark ? colors.elevated : colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => handleSuggestionPress(sug)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${typeColor}15` }]}>
              <Ionicons name={getTypeIcon(sug.type) as any} size={16} color={typeColor} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {sug.title}
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                {sug.subtitle}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => dismissSuggestion(sug.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.dismissBtn}
            >
              <Ionicons name="close" size={14} color={colors.warning} />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  headerIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.caption1,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  cardTitle: {
    ...typography.footnote,
    fontWeight: '600',
    marginBottom: 1,
  },
  cardSubtitle: {
    ...typography.caption1,
    lineHeight: 16,
  },
  dismissBtn: {
    padding: 4,
  },
});
