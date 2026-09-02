import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInDays, differenceInHours, differenceInMinutes, parseISO, isPast, isSameDay } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useCountdownStore } from '../src/stores/countdownStore';
import { useAlert } from '../src/components/AlertProvider';
import { usePremiumGate } from '../src/hooks/usePremiumGate';

const EMOJI_OPTIONS = ['🎂', '✈️', '🎉', '💍', '🎄', '🏖️', '🎓', '🏠', '❤️', '🎁', '⭐', '🚀'];
const COLOR_OPTIONS = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#06B6D4'];

export default function CountdownsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { requirePremium } = usePremiumGate();
  const { countdowns, fetchCountdowns, addCountdown, deleteCountdown } = useCountdownStore();

  useFocusEffect(useCallback(() => { requirePremium('countdowns'); }, [requirePremium]));
  const { showAlert } = useAlert();
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [timeSet, setTimeSet] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [emoji, setEmoji] = useState('🎉');
  const [color, setColor] = useState('#6366F1');
  const [, setTick] = useState(0);

  useFocusEffect(useCallback(() => {
    fetchCountdowns();
  }, []));

  // Update countdown values every minute
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Sort: upcoming first, then past
  const sorted = useMemo(() => {
    return [...countdowns].sort((a, b) => {
      const aPast = isPast(parseISO(a.date));
      const bPast = isPast(parseISO(b.date));
      if (aPast !== bPast) return aPast ? 1 : -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [countdowns]);

  const handleAdd = async () => {
    if (!title.trim()) return;
    Keyboard.dismiss();
    await addCountdown({
      title: title.trim(),
      date: format(date, "yyyy-MM-dd'T'HH:mm:ss"),
      emoji,
      color,
    });
    setTitle('');
    setDate(new Date());
    setTimeSet(false);
    setEmoji('🎉');
    setColor('#6366F1');
    setShowAddForm(false);
  };

  const handleDelete = (id: string, name: string) => {
    showAlert('Remove Countdown', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCountdown(id) },
    ]);
  };

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Countdowns</Text>
        <TouchableOpacity
          onPress={() => setShowAddForm(!showAddForm)}
          style={styles.addBtn}
          activeOpacity={0.7}
        >
          <Ionicons name={showAddForm ? 'close' : 'add'} size={22} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Add Form */}
        {showAddForm && (
          <View style={styles.addFormCard}>
            <Text style={styles.addFormTitle}>New Countdown</Text>

            <TextInput
              style={styles.titleInput}
              placeholder="What are you counting down to?"
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
            />

            {/* Date Picker */}
            <TouchableOpacity
              style={styles.datePickerBtn}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={styles.datePickerText}>
                {format(date, 'EEEE, MMM d, yyyy')}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker themeVariant="light"
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, d) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (d) setDate(d);
                }}
                minimumDate={new Date()}
              />
            )}

            {/* Time Picker */}
            <TouchableOpacity
              style={styles.datePickerBtn}
              onPress={() => setShowTimePicker(!showTimePicker)}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={styles.datePickerText}>
                {timeSet ? format(date, 'h:mm a') : 'Set time'}
              </Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker themeVariant="light"
                value={date}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  setShowTimePicker(Platform.OS === 'ios');
                  if (d) {
                    setDate(d);
                    setTimeSet(true);
                  }
                }}
                minimumDate={isSameDay(date, new Date()) ? new Date() : undefined}
              />
            )}

            {/* Emoji Picker */}
            <Text style={styles.fieldLabel}>Icon</Text>
            <View style={styles.emojiRow}>
              {EMOJI_OPTIONS.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
                  onPress={() => setEmoji(e)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Color Picker */}
            <Text style={styles.fieldLabel}>Color</Text>
            <View style={styles.colorRow}>
              {COLOR_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorBtn, { backgroundColor: c }, color === c && styles.colorBtnActive]}
                  onPress={() => setColor(c)}
                  activeOpacity={0.7}
                >
                  {color === c && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAddForm(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, !title.trim() && { opacity: 0.4 }]}
                onPress={handleAdd}
                disabled={!title.trim()}
                activeOpacity={0.7}
              >
                <Ionicons name="timer-outline" size={16} color="#FFFFFF" />
                <Text style={styles.createText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Countdown Cards */}
        {sorted.length === 0 && !showAddForm && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="timer-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No countdowns</Text>
            <Text style={styles.emptyDesc}>
              Track exciting events — birthdays, trips, anniversaries, and milestones.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => setShowAddForm(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.emptyBtnText}>Add Countdown</Text>
            </TouchableOpacity>
          </View>
        )}

        {sorted.map((countdown) => {
          const targetDate = parseISO(countdown.date);
          const past = isPast(targetDate);
          const daysLeft = differenceInDays(targetDate, new Date());
          const hoursLeft = differenceInHours(targetDate, new Date()) % 24;

          // Progress ring: assume 90 days max for visual
          const totalDays = 90;
          const progress = past ? 1 : Math.max(0, 1 - daysLeft / totalDays);
          const circumference = 2 * Math.PI * 42;
          const strokeDashoffset = circumference * (1 - Math.min(progress, 1));

          return (
            <TouchableOpacity
              key={countdown.id}
              style={styles.countdownCard}
              onLongPress={() => handleDelete(countdown.id, countdown.title)}
              activeOpacity={0.8}
            >
              {/* Left: Ring + Emoji */}
              <View style={styles.ringContainer}>
                <View style={[styles.ringBg, { borderColor: countdown.color + '20' }]}>
                  <View style={[styles.ringProgress, {
                    borderColor: past ? colors.textTertiary : countdown.color,
                    borderTopColor: past ? colors.textTertiary : countdown.color,
                    borderRightColor: progress > 0.25 ? (past ? colors.textTertiary : countdown.color) : 'transparent',
                    borderBottomColor: progress > 0.5 ? (past ? colors.textTertiary : countdown.color) : 'transparent',
                    borderLeftColor: progress > 0.75 ? (past ? colors.textTertiary : countdown.color) : 'transparent',
                    transform: [{ rotate: '-90deg' }],
                  }]} />
                  <Text style={styles.ringEmoji}>{countdown.emoji}</Text>
                </View>
              </View>

              {/* Center: Info */}
              <View style={styles.countdownInfo}>
                <Text style={styles.countdownTitle} numberOfLines={1}>
                  {countdown.title}
                </Text>
                <Text style={styles.countdownDate}>
                  {format(targetDate, 'MMM d, yyyy')}
                </Text>
              </View>

              {/* Right: Days */}
              <View style={styles.daysContainer}>
                {past ? (
                  <Text style={styles.pastText}>Passed</Text>
                ) : daysLeft === 0 ? (
                  <>
                    <Text style={[styles.daysNumber, { color: countdown.color }]}>
                      {hoursLeft}
                    </Text>
                    <Text style={styles.daysLabel}>hours</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.daysNumber, { color: countdown.color }]}>
                      {daysLeft}
                    </Text>
                    <Text style={styles.daysLabel}>
                      {daysLeft === 1 ? 'day' : 'days'}
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
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
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...typography.headline, color: colors.text, flex: 1, textAlign: 'center' },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },

  // Add form
  addFormCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  addFormTitle: { ...typography.title3, color: colors.text, marginBottom: spacing.lg },
  titleInput: {
    ...typography.body,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  datePickerText: { ...typography.body, color: colors.text },
  fieldLabel: {
    ...typography.subhead,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  emojiBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  emojiBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  colorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  colorBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'transparent',
  },
  colorBtnActive: {
    borderColor: colors.background,
    ...shadows.sm,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelBtn: {
    flex: 1, alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  cancelText: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
  createBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.md,
    borderRadius: radius.lg, backgroundColor: colors.primary,
  },
  createText: { ...typography.body, color: '#FFFFFF', fontWeight: '600' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: spacing['2xl'] },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  emptyTitle: { ...typography.headline, color: colors.text, marginBottom: spacing.xs },
  emptyDesc: {
    ...typography.body, color: colors.textSecondary,
    textAlign: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.lg,
  },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  emptyBtnText: { ...typography.subhead, color: '#FFFFFF', fontWeight: '600' },

  // Countdown cards
  countdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  ringContainer: {
    marginRight: spacing.md,
  },
  ringBg: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  ringProgress: {
    position: 'absolute',
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 3,
  },
  ringEmoji: { fontSize: 24 },
  countdownInfo: { flex: 1 },
  countdownTitle: { ...typography.headline, color: colors.text },
  countdownDate: { ...typography.caption1, color: colors.textSecondary, marginTop: 2 },
  daysContainer: { alignItems: 'center', minWidth: 50 },
  daysNumber: { ...typography.title1, fontWeight: '700' },
  daysLabel: { ...typography.caption1, color: colors.textSecondary },
  pastText: { ...typography.subhead, color: colors.textTertiary },
});
