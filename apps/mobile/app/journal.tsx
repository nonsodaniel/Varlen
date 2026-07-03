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
import { parseISO, isToday, isYesterday, format } from 'date-fns';
import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
} from '../src/constants/theme';
import { useJournalStore } from '../src/stores/journalStore';

const moodEmojis: Record<number, string> = {
  1: '\uD83D\uDE14',
  2: '\uD83D\uDE10',
  3: '\uD83D\uDE42',
  4: '\uD83D\uDE0A',
  5: '\uD83E\uDD29',
};

const moodBackgrounds: Record<number, string> = {
  1: '#FEE2E2',
  2: '#F3F4F6',
  3: '#FEF3C7',
  4: '#D1FAE5',
  5: '#DBEAFE',
};

function formatDateLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE, MMM d');
}

export default function JournalScreen() {
  const router = useRouter();
  const { entries } = useJournalStore();

  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [entries]
  );

  const handleNewEntry = () => {
    router.push('/add-journal');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Journal</Text>
        <View style={{ width: 40 }} />
      </View>

      {sortedEntries.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="pencil-outline" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>Start your journal</Text>
          <Text style={styles.emptySubtitle}>
            Capture your thoughts, moods, and gratitude daily.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {sortedEntries.map((entry) => {
            const moodBg = moodBackgrounds[entry.mood] || moodBackgrounds[3];
            const moodEmoji = moodEmojis[entry.mood] || moodEmojis[3];

            return (
              <View
                key={entry.id}
                style={[styles.card, { backgroundColor: moodBg }]}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.dateLabel}>
                    {formatDateLabel(entry.date)}
                  </Text>
                  <Text style={styles.moodEmoji}>{moodEmoji}</Text>
                </View>

                {entry.gratitude ? (
                  <Text style={styles.gratitudeText}>
                    &ldquo;{entry.gratitude}&rdquo;
                  </Text>
                ) : null}

                {entry.note ? (
                  <Text style={styles.noteText}>{entry.note}</Text>
                ) : null}
              </View>
            );
          })}

          <View style={{ height: spacing['3xl'] }} />
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.7}
        onPress={handleNewEntry}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>
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
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dateLabel: {
    ...typography.headline,
    color: colors.text,
  },
  moodEmoji: {
    fontSize: 28,
  },
  gratitudeText: {
    ...typography.body,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  noteText: {
    ...typography.body,
    color: colors.text,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyTitle: {
    ...typography.title2,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  fab: {
    position: 'absolute',
    bottom: 36,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
