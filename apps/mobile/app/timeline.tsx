import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
} from '../src/constants/theme';
import { getUserName, getUserColor, currentUser } from '../src/data/mock';
import { Avatar } from '../src/components/ui/Avatar';

let timelineData: typeof import('../src/data/mock').mockTimeline | undefined;
try {
  timelineData = require('../src/data/mock').mockTimeline;
} catch {}

const fallbackTimeline = [
  { id: 't1', title: 'Moved in together', emoji: '\uD83C\uDFE0', date: '2024-01-15', category: 'milestone' as const, createdBy: 'user-1' },
  { id: 't2', title: 'First vacation \u2014 Cabo', emoji: '\u2708\uFE0F', date: '2024-03-22', category: 'milestone' as const, createdBy: 'user-2' },
  { id: 't3', title: 'Adopted Luna', description: 'Our golden retriever', emoji: '\uD83D\uDC36', date: '2024-08-10', category: 'milestone' as const, createdBy: 'user-2' },
  { id: 't4', title: '1 year anniversary', emoji: '\u2764\uFE0F', date: '2025-02-14', category: 'milestone' as const, createdBy: 'user-1' },
  { id: 't5', title: 'Got engaged', description: 'At sunset on the beach', emoji: '\uD83D\uDC8D', date: '2025-06-01', category: 'milestone' as const, createdBy: 'user-1' },
  { id: 't6', title: 'Started Sivena', emoji: '\uD83D\uDE80', date: '2026-01-10', category: 'achievement' as const, createdBy: 'user-1' },
  { id: 't7', title: 'Family road trip', description: 'Coast to coast adventure', emoji: '\uD83D\uDE97', date: '2026-05-15', category: 'event' as const, createdBy: 'user-2' },
];

const entries = timelineData && timelineData.length > 0 ? timelineData : fallbackTimeline;

const categoryDotColors: Record<string, string> = {
  milestone: '#3B82F6',
  achievement: '#10B981',
  event: '#F59E0B',
  memory: '#EC4899',
};

export default function TimelineScreen() {
  const router = useRouter();

  // Group entries by year, sorted descending
  const yearGroups = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const groups: { year: number; items: typeof sorted }[] = [];
    const map = new Map<number, typeof sorted>();

    for (const entry of sorted) {
      const year = new Date(entry.date).getFullYear();
      if (!map.has(year)) {
        map.set(year, []);
      }
      map.get(year)!.push(entry);
    }

    for (const [year, items] of map) {
      groups.push({ year, items });
    }

    return groups.sort((a, b) => b.year - a.year);
  }, []);

  const handleAddMilestone = () => {
    router.push('/add-timeline-entry');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Family Timeline</Text>
        <TouchableOpacity
          onPress={handleAddMilestone}
          style={styles.addBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {yearGroups.map((group) => (
          <View key={group.year} style={styles.yearSection}>
            {/* Year header */}
            <View style={styles.yearHeader}>
              <Text style={styles.yearText}>{group.year}</Text>
              <View style={styles.yearCountPill}>
                <Text style={styles.yearCountText}>{group.items.length}</Text>
              </View>
            </View>

            {/* Timeline entries */}
            <View style={styles.timelineContainer}>
              {/* Vertical line */}
              <View style={styles.timelineLine} />

              {group.items.map((entry, idx) => {
                const dotColor =
                  categoryDotColors[entry.category] || colors.primary;

                return (
                  <View key={entry.id} style={styles.entryRow}>
                    {/* Dot on the line */}
                    <View style={styles.dotColumn}>
                      <View
                        style={[styles.dot, { backgroundColor: dotColor }]}
                      />
                    </View>

                    {/* Card */}
                    <View style={styles.entryCard}>
                      <View style={styles.entryTopRow}>
                        <Text style={styles.entryEmoji}>{entry.emoji}</Text>
                        <Text style={styles.entryTitle} numberOfLines={2}>
                          {entry.title}
                        </Text>
                      </View>

                      {entry.description ? (
                        <Text
                          style={styles.entryDescription}
                          numberOfLines={2}
                        >
                          {entry.description}
                        </Text>
                      ) : null}

                      <View style={styles.entryBottomRow}>
                        <Text style={styles.entryDate}>
                          {format(parseISO(entry.date), 'MMM d, yyyy')}
                        </Text>
                        <Avatar
                          name={getUserName(entry.createdBy)}
                          size={24}
                          color={getUserColor(entry.createdBy)}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },

  // Year section
  yearSection: {
    marginBottom: spacing.xl,
  },
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  yearText: {
    ...typography.title2,
    color: colors.text,
  },
  yearCountPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  yearCountText: {
    ...typography.caption1,
    color: colors.textInverse,
  },

  // Timeline
  timelineContainer: {
    position: 'relative',
    paddingLeft: 24,
  },
  timelineLine: {
    position: 'absolute',
    left: 5,
    top: 6,
    bottom: 6,
    width: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  entryRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  dotColumn: {
    width: 24,
    alignItems: 'flex-start',
    paddingTop: spacing.lg,
    marginLeft: -24,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.background,
  },
  entryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  entryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  entryEmoji: {
    fontSize: 28,
  },
  entryTitle: {
    ...typography.headline,
    color: colors.text,
    flex: 1,
  },
  entryDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  entryBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  entryDate: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
});
