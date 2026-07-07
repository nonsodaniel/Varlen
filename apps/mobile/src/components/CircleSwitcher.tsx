import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useCircleStore, Circle } from '../stores/circleStore';
import { colors } from '../constants/theme';

const DEFAULT_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'];

export function CircleSwitcher() {
  const { circles, activeCircleId, setActiveCircle } = useCircleStore();

  if (circles.length <= 1) return null;

  const isAllActive = activeCircleId === null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          style={[styles.pill, isAllActive && styles.pillActive]}
          onPress={() => setActiveCircle(null)}
          activeOpacity={0.7}
        >
          <Text style={[styles.pillText, isAllActive && styles.pillTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        {circles.map((circle, index) => {
          const isActive = activeCircleId === circle.id;
          const circleColor = circle.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];

          return (
            <TouchableOpacity
              key={circle.id}
              style={[
                styles.pill,
                isActive && { backgroundColor: circleColor },
              ]}
              onPress={() => setActiveCircle(circle.id)}
              activeOpacity={0.7}
            >
              {circle.emoji ? (
                <Text style={styles.emoji}>{circle.emoji}</Text>
              ) : null}
              <Text
                style={[
                  styles.pillText,
                  isActive && styles.pillTextActive,
                ]}
                numberOfLines={1}
              >
                {circle.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    gap: 4,
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  emoji: {
    fontSize: 14,
  },
});
