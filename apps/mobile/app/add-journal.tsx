import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, typography, spacing, radius, shadows } from '../src/constants/theme';
import { Input } from '../src/components/ui/Input';
import { useJournalStore } from '../src/stores/journalStore';
import { useAuthStore } from '../src/stores/authStore';
import { useAlert } from '../src/components/AlertProvider';

const moodOptions = [
  { value: 1, emoji: '\uD83D\uDE14', label: 'Rough' },
  { value: 2, emoji: '\uD83D\uDE10', label: 'Meh' },
  { value: 3, emoji: '\uD83D\uDE42', label: 'Okay' },
  { value: 4, emoji: '\uD83D\uDE0A', label: 'Good' },
  { value: 5, emoji: '\uD83E\uDD29', label: 'Great' },
];

export default function AddJournalScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const user = useAuthStore((s) => s.user);
  const currentUser = { id: user?.id ?? '', name: user?.name ?? 'You', email: user?.email ?? '' };
  const { addEntry } = useJournalStore();
  const [mood, setMood] = useState(3);
  const [gratitude, setGratitude] = useState('');
  const [note, setNote] = useState('');

  const handleSave = async () => {
    if (!gratitude.trim() && !note.trim()) return;
    Keyboard.dismiss();
    try {
      await addEntry({
        date: format(new Date(), 'yyyy-MM-dd'),
        mood,
        gratitude: gratitude.trim(),
        note: note.trim(),
        createdBy: currentUser.id,
      });
      router.back();
    } catch {
      showAlert('Error', 'Could not save entry. Please try again.');
    }
  };

  const canSave = gratitude.trim() || note.trim();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Entry</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            activeOpacity={0.7}
          >
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.dateText}>{format(new Date(), 'EEEE, MMMM d')}</Text>

          <Text style={styles.label}>How are you feeling?</Text>
          <View style={styles.moodRow}>
            {moodOptions.map((m) => (
              <TouchableOpacity
                key={m.value}
                style={[styles.moodBtn, mood === m.value && styles.moodBtnActive]}
                onPress={() => setMood(m.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                <Text style={[styles.moodLabel, mood === m.value && styles.moodLabelActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>What are you grateful for?</Text>
          <Input
            placeholder="Today I'm grateful for..."
            value={gratitude}
            onChangeText={setGratitude}
            multiline
            style={styles.textArea}
          />

          <Text style={styles.label}>Notes</Text>
          <Input
            placeholder="How was your day?"
            value={note}
            onChangeText={setNote}
            multiline
            style={styles.textAreaLarge}
          />

          <View style={{ height: spacing['3xl'] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...typography.headline, color: colors.text },
  saveBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.full,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { ...typography.subhead, color: colors.textInverse, fontWeight: '600' },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  dateText: {
    ...typography.title3, color: colors.text, marginBottom: spacing.xl,
  },
  label: {
    ...typography.headline, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.lg,
  },
  moodRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm,
  },
  moodBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 2, borderColor: 'transparent', ...shadows.sm,
  },
  moodBtnActive: {
    borderColor: colors.primary, backgroundColor: colors.primaryLight,
  },
  moodEmoji: { fontSize: 28, marginBottom: spacing.xs },
  moodLabel: { ...typography.caption2, color: colors.textSecondary },
  moodLabelActive: { color: colors.primary, fontWeight: '600' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  textAreaLarge: { minHeight: 120, textAlignVertical: 'top' },
});
