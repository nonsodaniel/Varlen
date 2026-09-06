import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { Input } from '../src/components/ui/Input';
import { useWellnessStore } from '../src/stores/wellnessStore';
import { useAlert } from '../src/components/AlertProvider';

const moodOptions = [
  { value: 1 as const, emoji: '\uD83D\uDE14', label: 'Rough' },
  { value: 2 as const, emoji: '\uD83D\uDE10', label: 'Meh' },
  { value: 3 as const, emoji: '\uD83D\uDE42', label: 'Okay' },
  { value: 4 as const, emoji: '\uD83D\uDE0A', label: 'Good' },
  { value: 5 as const, emoji: '\uD83E\uDD29', label: 'Great' },
];

const waterOptions = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export default function AddWellnessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { showAlert } = useAlert();
  const { addEntry, getTodayEntry, updateEntry } = useWellnessStore();

  const existing = getTodayEntry();

  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(existing?.mood ?? 3);
  const [sleep, setSleep] = useState(existing?.sleep?.toString() ?? '');
  const [water, setWater] = useState(existing?.water ?? 0);
  const [exercise, setExercise] = useState(existing?.exercise ?? false);
  const [note, setNote] = useState(existing?.note ?? '');

  // Custom metrics state
  const [customMetrics, setCustomMetrics] = useState<Record<string, string>>(
    existing?.customMetrics ?? {},
  );
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [newMetricName, setNewMetricName] = useState('');
  const [newMetricValue, setNewMetricValue] = useState('');

  const handleAddMetric = () => {
    const name = newMetricName.trim();
    const value = newMetricValue.trim();
    if (!name || !value) return;
    setCustomMetrics((prev) => ({ ...prev, [name]: value }));
    setNewMetricName('');
    setNewMetricValue('');
    setShowAddMetric(false);
    Keyboard.dismiss();
  };

  const handleRemoveMetric = (key: string) => {
    setCustomMetrics((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    try {
      const sleepHours = parseFloat(sleep) || 0;
      const data = {
        mood,
        sleep: sleepHours,
        water,
        exercise,
        note: note.trim() || undefined,
        customMetrics: Object.keys(customMetrics).length > 0 ? customMetrics : undefined,
      };

      if (existing) {
        await updateEntry(existing.id, data);
      } else {
        await addEntry({
          date: format(new Date(), 'yyyy-MM-dd'),
          ...data,
        });
      }
      router.canGoBack() ? router.back() : router.replace('/(tabs)' as any);
    } catch {
      showAlert('Error', 'Could not save wellness log. Please try again.');
    }
  };

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} style={styles.headerBtn} activeOpacity={0.7}>
            <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {existing ? 'Update Wellness' : 'Log Wellness'}
          </Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn} activeOpacity={0.7}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.dateText}>{format(new Date(), 'EEEE, MMMM d')}</Text>

          {/* Mood */}
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

          {/* Sleep */}
          <Text style={styles.label}>Hours of sleep</Text>
          <Text style={styles.hint}>How many hours did you sleep last night?</Text>
          <Input
            placeholder="e.g. 7.5"
            value={sleep}
            onChangeText={setSleep}
            keyboardType="decimal-pad"
          />

          {/* Water */}
          <Text style={styles.label}>Glasses of water</Text>
          <Text style={styles.hint}>How many glasses have you had today?</Text>
          <View style={styles.waterRow}>
            {waterOptions.map((w) => (
              <TouchableOpacity
                key={w}
                style={[styles.waterBtn, water === w && styles.waterBtnActive]}
                onPress={() => setWater(w)}
                activeOpacity={0.7}
              >
                <Text style={[styles.waterText, water === w && styles.waterTextActive]}>{w}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Exercise */}
          <Text style={styles.label}>Did you exercise?</Text>
          <View style={styles.exerciseRow}>
            <TouchableOpacity
              style={[styles.exerciseBtn, exercise && styles.exerciseBtnActive]}
              onPress={() => setExercise(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle" size={20} color={exercise ? '#FFFFFF' : colors.success} />
              <Text style={[styles.exerciseBtnText, exercise && styles.exerciseBtnTextActive]}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exerciseBtn, !exercise && styles.exerciseBtnInactive]}
              onPress={() => setExercise(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color={!exercise ? '#FFFFFF' : colors.textTertiary} />
              <Text style={[styles.exerciseBtnText, !exercise && styles.exerciseBtnTextActive]}>Not today</Text>
            </TouchableOpacity>
          </View>

          {/* Note */}
          <Text style={styles.label}>Notes (optional)</Text>
          <Input
            placeholder="Anything on your mind..."
            value={note}
            onChangeText={setNote}
            multiline
            style={styles.textArea}
          />

          {/* Custom Metrics */}
          <Text style={styles.label}>Custom tracking</Text>
          <Text style={styles.hint}>Track anything else — steps, meditation, stress, etc.</Text>

          {Object.entries(customMetrics).map(([key, value]) => (
            <View key={key} style={styles.metricRow}>
              <View style={styles.metricContent}>
                <Text style={styles.metricName}>{key}</Text>
                <Text style={styles.metricValue}>{value}</Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveMetric(key)} activeOpacity={0.7} style={styles.metricDelete}>
                <Ionicons name="close-circle" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}

          {showAddMetric ? (
            <View style={styles.addMetricForm}>
              <TextInput
                style={[styles.metricInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Metric name (e.g. Steps)"
                placeholderTextColor={colors.textTertiary}
                value={newMetricName}
                onChangeText={setNewMetricName}
                returnKeyType="next"
                autoFocus
              />
              <TextInput
                style={[styles.metricInput, { color: colors.text, borderColor: colors.border, marginTop: spacing.sm }]}
                placeholder="Value (e.g. 8000)"
                placeholderTextColor={colors.textTertiary}
                value={newMetricValue}
                onChangeText={setNewMetricValue}
                returnKeyType="done"
                onSubmitEditing={handleAddMetric}
              />
              <View style={styles.addMetricActions}>
                <TouchableOpacity
                  onPress={() => { setShowAddMetric(false); setNewMetricName(''); setNewMetricValue(''); }}
                  style={[styles.metricActionBtn, { borderColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.metricActionText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddMetric}
                  disabled={!newMetricName.trim() || !newMetricValue.trim()}
                  style={[styles.metricActionBtn, styles.metricActionPrimary, (!newMetricName.trim() || !newMetricValue.trim()) && { opacity: 0.4 }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.metricActionText, { color: '#fff' }]}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setShowAddMetric(true)} style={styles.addMetricBtn} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.addMetricText}>Add metric</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: spacing['3xl'] }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerBtn: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xs, minWidth: 60 },
  cancelText: { ...typography.body },
  headerTitle: { ...typography.headline, color: colors.text, flex: 1, textAlign: 'center' },
  saveBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.md,
    minWidth: 60, alignItems: 'center',
  },
  saveBtnText: { ...typography.callout, color: colors.textInverse, fontWeight: '600' },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  dateText: { ...typography.title3, color: colors.text, marginBottom: spacing.xl },
  label: { ...typography.headline, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.lg },
  hint: { ...typography.callout, color: colors.textSecondary, marginBottom: spacing.sm },

  // Mood
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  moodBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 2, borderColor: 'transparent', ...shadows.sm,
  },
  moodBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  moodEmoji: { fontSize: 28, marginBottom: spacing.xs },
  moodLabel: { ...typography.caption2, color: colors.textSecondary },
  moodLabelActive: { color: colors.primary, fontWeight: '600' },

  // Water
  waterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  waterBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.borderLight, ...shadows.sm,
  },
  waterBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  waterText: { ...typography.headline, color: colors.textSecondary },
  waterTextActive: { color: colors.primary, fontWeight: '700' },

  // Exercise
  exerciseRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  exerciseBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 14,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 2, borderColor: colors.borderLight, ...shadows.sm,
  },
  exerciseBtnActive: { backgroundColor: colors.success, borderColor: colors.success },
  exerciseBtnInactive: { backgroundColor: colors.textTertiary, borderColor: colors.textTertiary },
  exerciseBtnText: { ...typography.subhead, color: colors.textSecondary, fontWeight: '600' },
  exerciseBtnTextActive: { color: '#FFFFFF' },

  // Note
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  // Custom metrics
  metricRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginBottom: spacing.sm, ...shadows.sm,
  },
  metricContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metricName: { ...typography.subhead, color: colors.text, fontWeight: '600' },
  metricValue: { ...typography.subhead, color: colors.textSecondary },
  metricDelete: { padding: 4 },
  addMetricBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  addMetricText: { ...typography.callout, color: colors.primary, fontWeight: '600' },
  addMetricForm: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  metricInput: {
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: 15,
    backgroundColor: colors.background,
  },
  addMetricActions: {
    flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md,
  },
  metricActionBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md,
    alignItems: 'center', borderWidth: 1,
  },
  metricActionPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  metricActionText: { ...typography.callout, fontWeight: '600' },
});
