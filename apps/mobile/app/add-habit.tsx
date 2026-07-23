import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useHabitStore } from '../src/stores/habitStore';
import { haptics } from '../src/hooks/useHaptics';
import { PressableScale } from '../src/components/PressableScale';

const HABIT_COLORS = [
  { gradient: ['#3B82F6', '#2563EB'] as const },
  { gradient: ['#10B981', '#059669'] as const },
  { gradient: ['#F59E0B', '#D97706'] as const },
  { gradient: ['#8B5CF6', '#7C3AED'] as const },
  { gradient: ['#EC4899', '#DB2777'] as const },
  { gradient: ['#EF4444', '#DC2626'] as const },
];

const HABIT_EMOJIS = ['🏃', '📖', '💧', '🧘', '✍️', '🎯', '💪', '🧠', '🌅', '😴', '🥗', '🎨'];

export default function AddHabitScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { addHabit } = useHabitStore();

  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🏃');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [selectedColor, setSelectedColor] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    Keyboard.dismiss();
    setSaving(true);
    try {
      await addHabit({
        title: title.trim(),
        emoji,
        frequency,
        color: HABIT_COLORS[selectedColor].gradient[0],
        createdBy: '',
      });
      haptics.success();
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>New Habit</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Icon</Text>
        <View style={styles.emojiGrid}>
          {HABIT_EMOJIS.map((e) => (
            <PressableScale
              key={e}
              onPress={() => { haptics.selection(); setEmoji(e); }}
            >
              <View
                style={[
                  styles.emojiOption,
                  { backgroundColor: colors.surface, borderColor: colors.borderLight },
                  emoji === e && { borderColor: HABIT_COLORS[selectedColor].gradient[0], borderWidth: 2.5 },
                ]}
              >
                <Text style={{ fontSize: 26 }}>{e}</Text>
              </View>
            </PressableScale>
          ))}
        </View>

        {/* Name */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Habit name</Text>
        <TextInput
          style={[styles.input, {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
          }]}
          placeholder="e.g. Morning stretches, Read 20 min..."
          placeholderTextColor={colors.textTertiary}
          value={title}
          onChangeText={setTitle}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />

        {/* Frequency */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Frequency</Text>
        <View style={styles.freqRow}>
          {(['daily', 'weekly'] as const).map((f) => (
            <PressableScale key={f} onPress={() => { haptics.selection(); setFrequency(f); }}>
              <View style={[
                styles.freqChip,
                { backgroundColor: colors.surface, borderColor: colors.borderLight },
                frequency === f && {
                  backgroundColor: HABIT_COLORS[selectedColor].gradient[0],
                  borderColor: HABIT_COLORS[selectedColor].gradient[0],
                },
              ]}>
                <Text style={[
                  styles.freqChipText,
                  { color: frequency === f ? '#fff' : colors.textSecondary },
                ]}>
                  {f === 'daily' ? 'Daily' : 'Weekly'}
                </Text>
              </View>
            </PressableScale>
          ))}
        </View>

        {/* Color */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Color</Text>
        <View style={styles.colorRow}>
          {HABIT_COLORS.map((c, i) => (
            <PressableScale key={i} onPress={() => { haptics.selection(); setSelectedColor(i); }}>
              <LinearGradient
                colors={c.gradient as unknown as [string, string]}
                style={[styles.colorDot, selectedColor === i && styles.colorDotActive]}
              >
                {selectedColor === i && <Ionicons name="checkmark" size={16} color="#fff" />}
              </LinearGradient>
            </PressableScale>
          ))}
        </View>

        {/* Preview */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Preview</Text>
        <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.borderLight, ...shadows.sm }]}>
          <LinearGradient
            colors={HABIT_COLORS[selectedColor].gradient as unknown as [string, string]}
            style={styles.previewEmojiWrap}
          >
            <Text style={{ fontSize: 22 }}>{emoji}</Text>
          </LinearGradient>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[styles.previewTitle, { color: colors.text }]} numberOfLines={1}>
              {title || 'Habit name'}
            </Text>
            <Text style={[styles.previewFreq, { color: colors.textSecondary }]}>
              {frequency === 'daily' ? 'Daily' : 'Weekly'}
            </Text>
          </View>
          <View style={[
            styles.previewToggle,
            { borderColor: HABIT_COLORS[selectedColor].gradient[0] },
          ]} />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
        <PressableScale onPress={handleSave} disabled={!title.trim() || saving}>
          <LinearGradient
            colors={HABIT_COLORS[selectedColor].gradient as unknown as [string, string]}
            style={[styles.saveBtn, (!title.trim() || saving) && { opacity: 0.5 }]}
          >
            <Ionicons name="checkmark" size={22} color="#fff" />
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Create Habit'}</Text>
          </LinearGradient>
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.title3,
    fontWeight: '700',
  },
  content: {
    padding: spacing.xl,
    paddingBottom: 48,
  },
  label: {
    ...typography.subheadline,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  emojiOption: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    ...typography.body,
  },
  freqRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  freqChip: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  freqChipText: {
    ...typography.subheadline,
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  colorDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotActive: {
    transform: [{ scale: 1.2 }],
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1.5,
  },
  previewEmojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: {
    ...typography.headline,
    fontWeight: '600',
  },
  previewFreq: {
    ...typography.caption1,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  previewToggle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Platform.OS === 'android' ? spacing.lg : spacing.md,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.full,
  },
  saveBtnText: {
    color: '#fff',
    ...typography.headline,
    fontWeight: '700',
  },
});
