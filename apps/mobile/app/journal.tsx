import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { parseISO, isToday, isYesterday, format } from 'date-fns';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useJournalStore } from '../src/stores/journalStore';

function formatDateLabel(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEE, MMM d');
  } catch {
    return dateStr;
  }
}

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { entries, fetchEntries, isLoading } = useJournalStore();

  useFocusEffect(useCallback(() => { fetchEntries(); }, []));

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [entries],
  );

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Journal</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading && entries.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : sortedEntries.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="pencil-outline" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>Your story starts here</Text>
          <Text style={styles.emptySubtitle}>
            A private space to write, reflect, and capture what matters to you.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {sortedEntries.map((entry) => {
            const preview = entry.note.length > 160
              ? entry.note.slice(0, 160).trimEnd() + '…'
              : entry.note;
            const wordCount = entry.note.trim().split(/\s+/).filter(Boolean).length;

            return (
              <View key={entry.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.entryDate}>{formatDateLabel(entry.date)}</Text>
                  <Text style={styles.wordCount}>{wordCount} words</Text>
                </View>

                {entry.title ? (
                  <Text style={styles.entryTitle} numberOfLines={1}>{entry.title}</Text>
                ) : null}

                <Text style={styles.entryPreview} numberOfLines={4}>{preview}</Text>
              </View>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        activeOpacity={0.85}
        onPress={() => router.push('/add-journal')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...typography.headline, color: colors.text, flex: 1, textAlign: 'center' },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80, paddingHorizontal: 40,
  },
  emptyTitle: { ...typography.title2, color: colors.text, marginTop: spacing.lg },
  emptySubtitle: {
    ...typography.body, color: colors.textSecondary,
    marginTop: spacing.sm, textAlign: 'center',
  },
  list: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.xs,
  },
  entryDate: { ...typography.callout, color: colors.textSecondary, fontWeight: '600' },
  wordCount: { ...typography.caption2, color: colors.textTertiary },
  entryTitle: {
    ...typography.headline, color: colors.text,
    marginBottom: spacing.xs,
  },
  entryPreview: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.lg,
  },
});
