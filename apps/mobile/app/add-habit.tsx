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
  { value: 'daily',    label: 'Every day',    sublabel: 'Mon – Sun' },
  { value: 'weekdays', label: 'Weekdays',      sublabel: 'Mon – Fri' },
  { value: 'weekends', label: 'Weekends',      sublabel: 'Sat & Sun' },
  { value: 'weekly',   label: 'Once a week',   sublabel: 'Pick any day' },
  { value: 'custom',   label: 'Custom',        sublabel: 'Pick your days' },
];

// Mon-first display order for day chips (Sun = 0, Mon = 1 … Sat = 6)
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_FULL   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AddHabitScreen() {
  const router = useRouter();
  const { colors, shadows, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { addHabit } = useHabitStore();

  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🏃');
  const [frequency, setFrequency] = useState<Habit['frequency']>('daily');
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [weeklyDay, setWeeklyDay] = useState<number>(1); // default Monday
  const [selectedColor, setSelectedColor] = useState(0);
  const [saving, setSaving] = useState(false);

  // Multiple reminder times — stored as "HH:mm" strings
  const [reminderTimes, setReminderTimes] = useState<string[]>([]);
  // Per-slot picker state: index of the slot being edited, or -1 for new slot
  const [editingTimeIndex, setEditingTimeIndex] = useState<number | null>(null);
  const [pickerDate, setPickerDate] = useState<Date>(() => {
    const d = new Date(); d.setHours(8, 0, 0, 0); return d;
  });

  const accentColor = HABIT_COLORS[selectedColor].gradient[0];

  const onTimeChange = (_: DateTimePickerEvent, date?: Date) => {
    if (!date) { setEditingTimeIndex(null); return; }
    const timeStr = format(date, 'HH:mm');
    if (editingTimeIndex === -1) {
      // Adding new time
      setReminderTimes((prev) => [...prev, timeStr].sort());
    } else if (editingTimeIndex !== null) {
      // Editing existing time
      setReminderTimes((prev) => prev.map((t, i) => i === editingTimeIndex ? timeStr : t).sort());
    }
    if (Platform.OS === 'android') setEditingTimeIndex(null);
  };

  const removeReminderTime = (index: number) => {
    setReminderTimes((prev) => prev.filter((_, i) => i !== index));
  };

  const openAddTimePicker = () => {
    const d = new Date(); d.setHours(8, 0, 0, 0);
    setPickerDate(d);
    setEditingTimeIndex(-1);
  };

  const openEditTimePicker = (index: number) => {
    const [h, m] = reminderTimes[index].split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    setPickerDate(d);
    setEditingTimeIndex(index);
  };

  const toggleDay = (day: number) => {
    haptics.selection();
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const canSave = !!title.trim() && !saving
    && (frequency !== 'custom' || customDays.length > 0)
    && (frequency !== 'weekly' || weeklyDay !== null);

  const handleSave = async () => {
    if (!canSave) return;
    Keyboard.dismiss();
    setSaving(true);
    try {
      await addHabit({
        title: title.trim(),
        emoji,
        frequency,
        color: accentColor,
        createdBy: useAuthStore.getState().user?.id ?? '',
        ...(frequency === 'custom' && { customDays }),
        ...(frequency === 'weekly' && { customDays: [weeklyDay] }),
        ...(reminderTimes.length > 0 && { reminderTimes }),
      });
      haptics.success();
      router.canGoBack() ? router.back() : router.replace('/(tabs)' as any);
    } finally {
      setSaving(false);
    }
  };

  const previewFreqText = () => {
    if (frequency === 'custom') {
      if (customDays.length === 0) return 'No days selected';
      return customDays
        .slice()
        .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
        .map((d) => DAY_FULL[d])
        .join(', ');
    }
    if (frequency === 'weekly') return `Every ${DAY_FULL[weeklyDay]}`;
    return FREQUENCY_OPTIONS.find((o) => o.value === frequency)?.label ?? frequency;
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
        keyboardDismissMode="on-drag"
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
                  emoji === e && { borderColor: accentColor, borderWidth: 2.5 },
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
                    backgroundColor: accentColor + '18',
                    borderColor: accentColor,
                    borderWidth: 2,
                  },
                  opt.value === 'custom' && styles.freqCardFull,
                ]}>
                  <Text style={[styles.freqLabel, { color: active ? accentColor : colors.text }]}>
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

        {/* Custom day chips — multi-select */}
        {frequency === 'custom' && (
          <View style={styles.customDaysRow}>
            {DAY_ORDER.map((dayIndex) => {
              const selected = customDays.includes(dayIndex);
              return (
                <PressableScale key={dayIndex} onPress={() => toggleDay(dayIndex)}>
                  <View style={[
                    styles.dayChip,
                    {
                      backgroundColor: selected ? accentColor : colors.surface,
                      borderColor: selected ? accentColor : colors.borderLight,
                    },
                  ]}>
                    <Text style={[styles.dayChipText, { color: selected ? '#fff' : colors.textSecondary }]}>
                      {DAY_LABELS[dayIndex]}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        )}

        {/* Weekly day picker — single-select */}
        {frequency === 'weekly' && (
          <View style={styles.customDaysRow}>
            {DAY_ORDER.map((dayIndex) => {
              const selected = weeklyDay === dayIndex;
              return (
                <PressableScale key={dayIndex} onPress={() => { haptics.selection(); setWeeklyDay(dayIndex); }}>
                  <View style={[
                    styles.dayChip,
                    {
                      backgroundColor: selected ? accentColor : colors.surface,
                      borderColor: selected ? accentColor : colors.borderLight,
                    },
                  ]}>
                    <Text style={[styles.dayChipText, { color: selected ? '#fff' : colors.textSecondary }]}>
                      {DAY_LABELS[dayIndex]}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        )}

        {/* Reminders — multiple times */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Reminders</Text>
        {reminderTimes.map((t, i) => {
          const [h, m] = t.split(':').map(Number);
          const d = new Date(); d.setHours(h, m, 0, 0);
          return (
            <View
              key={i}
              style={[styles.timeCard, { backgroundColor: colors.surface, borderColor: colors.borderLight, marginBottom: spacing.sm }]}
            >
              <TouchableOpacity
                style={[styles.reminderIcon, { backgroundColor: accentColor + '20' }]}
                onPress={() => openEditTimePicker(i)}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={20} color={accentColor} />
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => openEditTimePicker(i)} activeOpacity={0.7}>
                <Text style={[styles.timeCardText, { color: colors.text }]}>{format(d, 'h:mm a')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeReminderTime(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          );
        })}
        {/* Add time button */}
        <TouchableOpacity
          style={[styles.addTimeBtn, { borderColor: accentColor + '60', backgroundColor: accentColor + '10' }]}
          onPress={openAddTimePicker}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={18} color={accentColor} />
          <Text style={[styles.addTimeBtnText, { color: accentColor }]}>
            {reminderTimes.length === 0 ? 'Add reminder time' : 'Add another time'}
          </Text>
        </TouchableOpacity>
        {editingTimeIndex !== null && (
          <DateTimePicker
            value={pickerDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
            themeVariant={isDark ? 'dark' : 'light'}
          />
        )}

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
            <Text style={[styles.previewFreq, { color: colors.textSecondary }]} numberOfLines={1}>
              {previewFreqText()}
              {reminderTimes.length > 0 ? ` · ${reminderTimes.map((t) => { const [h,m] = t.split(':').map(Number); const d = new Date(); d.setHours(h,m); return format(d,'h:mm a'); }).join(', ')}` : ''}
            </Text>
          </View>
          <View style={[
            styles.previewToggle,
            { borderColor: accentColor },
          ]} />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
        <PressableScale onPress={handleSave} disabled={!canSave}>
          <LinearGradient
            colors={HABIT_COLORS[selectedColor].gradient as unknown as [string, string]}
            style={[styles.saveBtn, !canSave && { opacity: 0.5 }]}
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
  freqCardFull: {
    width: '100%',
    minWidth: 0,
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
  // Custom day chips
  customDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipText: {
    ...typography.caption1,
    fontWeight: '700',
    fontSize: 13,
  },
  // Time card (reminder slot row)
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1.5,
  },
  timeCardText: {
    ...typography.headline,
    fontWeight: '700',
    flex: 1,
  },
  reminderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addTimeBtnText: {
    ...typography.subhead,
    fontWeight: '600',
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
