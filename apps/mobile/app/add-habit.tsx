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
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useHabitStore } from '../src/stores/habitStore';
import { useAuthStore } from '../src/stores/authStore';
import { haptics } from '../src/hooks/useHaptics';
import { PressableScale } from '../src/components/PressableScale';
import type { Habit } from '../src/types';

const HABIT_COLORS = [
  { gradient: ['#3B82F6', '#2563EB'] as const },
  { gradient: ['#10B981', '#059669'] as const },
  { gradient: ['#F59E0B', '#D97706'] as const },
  { gradient: ['#8B5CF6', '#7C3AED'] as const },
  { gradient: ['#EC4899', '#DB2777'] as const },
  { gradient: ['#EF4444', '#DC2626'] as const },
];

const HABIT_EMOJIS = ['🏃', '📖', '💧', '🧘', '✍️', '🎯', '💪', '🧠', '🌅', '😴', '🥗', '🎨'];

const FREQUENCY_OPTIONS: { value: Habit['frequency']; label: string; sublabel: string }[] = [
  { value: 'daily',    label: 'Every day',      sublabel: 'Mon – Sun' },
  { value: 'weekdays', label: 'Weekdays',        sublabel: 'Mon – Fri' },
  { value: 'weekends', label: 'Weekends',        sublabel: 'Sat & Sun' },
  { value: 'weekly',   label: 'Once a week',     sublabel: 'Pick any day' },
];

export default function AddHabitScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { addHabit } = useHabitStore();

  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🏃');
  const [frequency, setFrequency] = useState<Habit['frequency']>('daily');
  const [selectedColor, setSelectedColor] = useState(0);
  const [saving, setSaving] = useState(false);

  // Reminder
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDate, setReminderDate] = useState(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);

  const onTimeChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (date) setReminderDate(date);
  };

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
        createdBy: useAuthStore.getState().user?.id ?? '',
        ...(reminderEnabled && { reminderTime: format(reminderDate, 'HH:mm') }),
      });
      haptics.success();
      router.canGoBack() ? router.back() : router.replace('/(tabs)' as any);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)}
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
        <View style={styles.freqGrid}>
          {FREQUENCY_OPTIONS.map((opt) => {
            const active = frequency === opt.value;
            return (
              <PressableScale key={opt.value} onPress={() => { haptics.selection(); setFrequency(opt.value); }}>
                <View style={[
                  styles.freqCard,
                  { backgroundColor: colors.surface, borderColor: colors.borderLight },
                  active && {
                    backgroundColor: HABIT_COLORS[selectedColor].gradient[0] + '18',
                    borderColor: HABIT_COLORS[selectedColor].gradient[0],
                    borderWidth: 2,
                  },
                ]}>
                  <Text style={[styles.freqLabel, { color: active ? HABIT_COLORS[selectedColor].gradient[0] : colors.text }]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.freqSublabel, { color: colors.textTertiary }]}>
                    {opt.sublabel}
                  </Text>
                </View>
              </PressableScale>
            );
          })}
        </View>

        {/* Reminder */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Reminder</Text>
        <View style={[styles.reminderCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.reminderRow}>
            <View style={styles.reminderLeft}>
              <View style={[styles.reminderIcon, { backgroundColor: HABIT_COLORS[selectedColor].gradient[0] + '20' }]}>
                <Ionicons name="notifications-outline" size={20} color={HABIT_COLORS[selectedColor].gradient[0]} />
              </View>
              <View>
                <Text style={[styles.reminderTitle, { color: colors.text }]}>Set reminder</Text>
                <Text style={[styles.reminderSub, { color: colors.textTertiary }]}>
                  {reminderEnabled ? `Notified at ${format(reminderDate, 'h:mm a')}` : 'No reminder set'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => { haptics.selection(); setReminderEnabled((v) => !v); }}
              activeOpacity={0.7}
              style={[
                styles.toggle,
                { backgroundColor: reminderEnabled ? HABIT_COLORS[selectedColor].gradient[0] : colors.border },
              ]}
            >
              <View style={[styles.toggleKnob, { transform: [{ translateX: reminderEnabled ? 20 : 2 }] }]} />
            </TouchableOpacity>
          </View>

          {reminderEnabled && (
            <>
              <View style={[styles.reminderDivider, { backgroundColor: colors.borderLight }]} />
              <TouchableOpacity
                style={styles.timePickerBtn}
                onPress={() => setShowTimePicker((v) => !v)}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={18} color={HABIT_COLORS[selectedColor].gradient[0]} />
                <Text style={[styles.timePickerText, { color: HABIT_COLORS[selectedColor].gradient[0] }]}>
                  {format(reminderDate, 'h:mm a')}
                </Text>
                <Ionicons name={showTimePicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
              </TouchableOpacity>

              {showTimePicker && (
                <DateTimePicker
                  value={reminderDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange}
                  themeVariant="light"
                />
              )}
            </>
          )}
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
              {FREQUENCY_OPTIONS.find((o) => o.value === frequency)?.label ?? frequency}
              {reminderEnabled ? ` · ${format(reminderDate, 'h:mm a')}` : ''}
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
    flex: 1,
    textAlign: 'center',
  },
  content: {
    padding: spacing.xl,
    paddingBottom: 48,
  },
  label: {
    ...typography.subhead,
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
    ...typography.body,
    fontSize: 16,
  },
  // Frequency grid — 2 columns
  freqGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  freqCard: {
    width: '48%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    minWidth: 140,
  },
  freqLabel: {
    ...typography.subhead,
    fontWeight: '700',
    marginBottom: 2,
  },
  freqSublabel: {
    ...typography.caption2,
    fontSize: 11,
  },
  // Reminder card
  reminderCard: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  reminderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderTitle: {
    ...typography.subhead,
    fontWeight: '600',
  },
  reminderSub: {
    ...typography.caption1,
    marginTop: 1,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  reminderDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
  },
  timePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  timePickerText: {
    ...typography.headline,
    fontWeight: '700',
    flex: 1,
  },
  // Color
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
  // Preview
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
