import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, addHours, parseISO, isSameDay } from 'date-fns';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { typography, spacing, radius, personColors } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { Input } from '../src/components/ui/Input';
import { useCalendarStore } from '../src/stores/calendarStore';
import { useAuthStore } from '../src/stores/authStore';
import { useAlert } from '../src/components/AlertProvider';
import { scheduleEventReminder } from '../src/services/pushNotifications';

const colorOptions: { label: string; value: string }[] = [
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Green', value: '#10B981' },
  { label: 'Gold', value: '#F59E0B' },
  { label: 'Pink', value: '#EC4899' },
  { label: 'Violet', value: '#8B5CF6' },
  { label: 'Coral', value: '#EF4444' },
];

const REMINDER_OPTIONS = [
  { label: 'None', value: 0 },
  { label: '5 min before', value: 5 },
  { label: '15 min before', value: 15 },
  { label: '30 min before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '1 day before', value: 1440 },
];

type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

const RECURRENCE_OPTIONS: { label: string; value: RecurrenceType; icon: string }[] = [
  { label: 'Never', value: 'none', icon: 'remove-circle-outline' },
  { label: 'Every day', value: 'daily', icon: 'today-outline' },
  { label: 'Every week', value: 'weekly', icon: 'calendar-outline' },
  { label: 'Every month', value: 'monthly', icon: 'calendar-number-outline' },
  { label: 'Every year', value: 'yearly', icon: 'globe-outline' },
];

export default function AddEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { showAlert } = useAlert();
  const user = useAuthStore((s) => s.user);
  const currentUser = { id: user?.id ?? '', name: user?.name ?? 'You', email: user?.email ?? '' };
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const { addEvent, updateEvent, events } = useCalendarStore();
  const existingEvent = eventId ? events.find((e) => e.id === eventId) : undefined;
  const isEditing = !!existingEvent;

  const [title, setTitle] = useState(existingEvent?.title ?? '');
  const [description, setDescription] = useState(existingEvent?.description ?? '');
  const [location, setLocation] = useState(existingEvent?.location ?? '');
  const [isAllDay, setIsAllDay] = useState(existingEvent?.allDay ?? false);
  const [isShared, setIsShared] = useState(existingEvent?.shared ?? true);
  const [selectedColor, setSelectedColor] = useState<string>(existingEvent?.color ?? personColors[0]);
  const [reminder, setReminder] = useState(0);
  const [recurrence, setRecurrence] = useState<RecurrenceType>(
    existingEvent?.recurring ?? 'none'
  );
  const [showRecurrence, setShowRecurrence] = useState(false);

  // Date/time state
  const [startDate, setStartDate] = useState(
    existingEvent ? parseISO(existingEvent.startDate) : addHours(new Date(), 1)
  );
  const [endDate, setEndDate] = useState(
    existingEvent ? parseISO(existingEvent.endDate) : addHours(new Date(), 2)
  );

  // Track whether user explicitly set times (no default time pre-selected)
  const [startTimeSet, setStartTimeSet] = useState(isEditing);
  const [endTimeSet, setEndTimeSet] = useState(isEditing);

  // Picker visibility (iOS shows inline, Android shows modal)
  const [showStartDate, setShowStartDate] = useState(false);
  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const onStartDateChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowStartDate(false);
    if (date) {
      setStartDate(date);
      // Auto-advance end date if start is after end
      if (date >= endDate) setEndDate(addHours(date, 1));
    }
  };

  const onStartTimeChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowStartTime(false);
    if (date) {
      setStartDate(date);
      setStartTimeSet(true);
      if (date >= endDate) setEndDate(addHours(date, 1));
    }
  };

  const onEndDateChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowEndDate(false);
    if (date) setEndDate(date);
  };

  const onEndTimeChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowEndTime(false);
    if (date) {
      setEndDate(date);
      setEndTimeSet(true);
    }
  };

  const handleSave = () => {
    if (!title.trim() || isSaving) return;
    Keyboard.dismiss();
    setIsSaving(true);
    // Optimistic update is applied synchronously inside addEvent/updateEvent; navigate back immediately
    if (isEditing && existingEvent) {
      updateEvent(existingEvent.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        allDay: isAllDay,
        color: selectedColor,
        location: location.trim() || undefined,
        shared: isShared,
        recurring: recurrence !== 'none' ? recurrence : undefined,
      });
    } else {
      addEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        allDay: isAllDay,
        color: selectedColor,
        location: location.trim() || undefined,
        createdBy: currentUser.id,
        shared: isShared,
        recurring: recurrence !== 'none' ? recurrence : undefined,
      }).then((created) => {
        // Schedule local reminder once we have the real server event ID
        if (created && reminder > 0) {
          scheduleEventReminder(created.id, title.trim(), startDate, reminder);
        }
      });
    }
    router.canGoBack() ? router.back() : router.replace('/(tabs)' as any);
  };

  return (
    <View style={styles.safe}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} style={styles.headerBtn} activeOpacity={0.7}>
          <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Event' : 'New Event'}</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!title.trim() || isSaving}
          style={[styles.saveBtn, (!title.trim() || isSaving) && styles.saveBtnDisabled]}
          activeOpacity={0.7}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Color banner preview */}
          <View style={styles.colorBanner}>
            <View style={[styles.colorBannerBar, { backgroundColor: selectedColor }]} />
            <Text style={[styles.colorBannerText, { color: selectedColor }]}>
              {title.trim() || 'Event preview'}
            </Text>
          </View>

          <Input label="Title" placeholder="What's happening?" value={title} onChangeText={setTitle} />
          <Input label="Location (optional)" placeholder="Add a location" value={location} onChangeText={setLocation} />

          {/* Date & Time Section */}
          <View style={styles.dateTimeCard}>
            {/* All Day Toggle */}
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeLeft}>
                <View style={[styles.dtIcon, { backgroundColor: colors.warningLight }]}>
                  <Ionicons name="sunny-outline" size={16} color={colors.warning} />
                </View>
                <Text style={styles.dtLabel}>All day</Text>
              </View>
              <Switch value={isAllDay} onValueChange={setIsAllDay} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
            </View>

            <View style={styles.dtDivider} />

            {/* Start Date */}
            <TouchableOpacity
              style={styles.dateTimeRow}
              onPress={() => setShowStartDate(!showStartDate)}
              activeOpacity={0.7}
            >
              <View style={styles.dateTimeLeft}>
                <View style={[styles.dtIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.dtLabel}>Starts</Text>
                  <Text style={styles.dtValue}>{format(startDate, 'EEE, MMM d, yyyy')}</Text>
                </View>
              </View>
              {!isAllDay && (
                <TouchableOpacity
                  onPress={() => setShowStartTime(!showStartTime)}
                  style={styles.timeChip}
                  activeOpacity={0.7}
                >
                  <Text style={styles.timeChipText}>{startTimeSet ? format(startDate, 'h:mm a') : 'Set time'}</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {showStartDate && (
              <DateTimePicker themeVariant="light"
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={onStartDateChange}
                minimumDate={new Date()}
                style={styles.picker}
              />
            )}

            {showStartTime && !isAllDay && (
              <DateTimePicker themeVariant="light"
                value={startDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onStartTimeChange}
                minimumDate={isSameDay(startDate, new Date()) ? new Date() : undefined}
                style={styles.pickerTime}
              />
            )}

            <View style={styles.dtDivider} />

            {/* End Date */}
            <TouchableOpacity
              style={styles.dateTimeRow}
              onPress={() => setShowEndDate(!showEndDate)}
              activeOpacity={0.7}
            >
              <View style={styles.dateTimeLeft}>
                <View style={[styles.dtIcon, { backgroundColor: colors.pinkLight }]}>
                  <Ionicons name="flag-outline" size={16} color="#EC4899" />
                </View>
                <View>
                  <Text style={styles.dtLabel}>Ends</Text>
                  <Text style={styles.dtValue}>{format(endDate, 'EEE, MMM d, yyyy')}</Text>
                </View>
              </View>
              {!isAllDay && (
                <TouchableOpacity
                  onPress={() => setShowEndTime(!showEndTime)}
                  style={styles.timeChip}
                  activeOpacity={0.7}
                >
                  <Text style={styles.timeChipText}>{endTimeSet ? format(endDate, 'h:mm a') : 'Set time'}</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {showEndDate && (
              <DateTimePicker themeVariant="light"
                value={endDate}
                mode="date"
                minimumDate={startDate}
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={onEndDateChange}
                style={styles.picker}
              />
            )}

            {showEndTime && !isAllDay && (
              <DateTimePicker themeVariant="light"
                value={endDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onEndTimeChange}
                minimumDate={isSameDay(endDate, new Date()) ? new Date() : undefined}
                style={styles.pickerTime}
              />
            )}
          </View>

          {/* Reminder */}
          <TouchableOpacity
            style={styles.reminderCard}
            onPress={() => setShowReminder(!showReminder)}
            activeOpacity={0.7}
          >
            <View style={styles.dateTimeLeft}>
              <View style={[styles.dtIcon, { backgroundColor: colors.purpleLight }]}>
                <Ionicons name="notifications-outline" size={16} color="#8B5CF6" />
              </View>
              <View>
                <Text style={styles.dtLabel}>Reminder</Text>
                <Text style={styles.dtValue}>
                  {REMINDER_OPTIONS.find((r) => r.value === reminder)?.label ?? 'None'}
                </Text>
              </View>
            </View>
            <Ionicons name={showReminder ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          {showReminder && (
            <View style={styles.reminderOptions}>
              {REMINDER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.reminderOpt, reminder === opt.value && styles.reminderOptActive]}
                  onPress={() => { setReminder(opt.value); setShowReminder(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.reminderOptText, reminder === opt.value && styles.reminderOptTextActive]}>
                    {opt.label}
                  </Text>
                  {reminder === opt.value && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Repeat / Recurrence */}
          <TouchableOpacity
            style={styles.reminderCard}
            onPress={() => setShowRecurrence(!showRecurrence)}
            activeOpacity={0.7}
          >
            <View style={styles.dateTimeLeft}>
              <View style={[styles.dtIcon, { backgroundColor: colors.successLight }]}>
                <Ionicons name="repeat-outline" size={16} color="#10B981" />
              </View>
              <View>
                <Text style={styles.dtLabel}>Repeat</Text>
                <Text style={styles.dtValue}>
                  {RECURRENCE_OPTIONS.find((r) => r.value === recurrence)?.label ?? 'Never'}
                </Text>
              </View>
            </View>
            <Ionicons name={showRecurrence ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          {showRecurrence && (
            <View style={styles.reminderOptions}>
              {RECURRENCE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.reminderOpt, recurrence === opt.value && styles.reminderOptActive]}
                  onPress={() => { setRecurrence(opt.value); setShowRecurrence(false); }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Ionicons name={opt.icon as any} size={16} color={recurrence === opt.value ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.reminderOptText, recurrence === opt.value && styles.reminderOptTextActive]}>
                      {opt.label}
                    </Text>
                  </View>
                  {recurrence === opt.value && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Notes */}
          <Input label="Notes (optional)" placeholder="Add details..." value={description} onChangeText={setDescription} multiline numberOfLines={3} style={styles.textArea} />

          {/* Color Picker */}
          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {colorOptions.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={[
                  styles.colorDot,
                  { backgroundColor: opt.value },
                  selectedColor === opt.value && styles.colorDotActive,
                ]}
                onPress={() => setSelectedColor(opt.value)}
                activeOpacity={0.7}
              >
                {selectedColor === opt.value && <Ionicons name="checkmark" size={14} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Shared toggle */}
          <View style={styles.toggleCard}>
            <View style={styles.toggle}>
              <View style={styles.toggleLeft}>
                <View style={[styles.toggleIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="people-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.toggleLabel}>Shared event</Text>
              </View>
              <Switch value={isShared} onValueChange={setIsShared} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
            </View>
          </View>

          <View style={{ height: spacing['3xl'] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  headerBtn: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xs, minWidth: 60 },
  cancelText: { ...typography.body },
  headerTitle: { ...typography.headline, color: colors.text, flex: 1, textAlign: 'center' },
  saveBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderRadius: radius.md, minWidth: 60, alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.border },
  saveBtnText: { ...typography.callout, color: '#FFFFFF', fontWeight: '700' },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },

  // Color banner
  colorBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.xl, ...shadows.sm,
  },
  colorBannerBar: { width: 4, height: 28, borderRadius: 2, marginRight: spacing.md },
  colorBannerText: { ...typography.headline },

  textArea: { height: 80, textAlignVertical: 'top', paddingTop: spacing.md },

  // Date & Time card
  dateTimeCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    marginBottom: spacing.md, ...shadows.sm, overflow: 'hidden',
  },
  dateTimeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg,
  },
  dateTimeLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dtIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  dtLabel: { ...typography.caption1, color: colors.textTertiary },
  dtValue: { ...typography.body, color: colors.text, marginTop: 1 },
  dtDivider: { height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg },
  timeChip: {
    backgroundColor: colors.primaryLight, paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs, borderRadius: radius.full,
  },
  timeChipText: { ...typography.subhead, color: colors.primary, fontWeight: '600' },
  picker: { marginHorizontal: spacing.md, marginBottom: spacing.md },
  pickerTime: { marginHorizontal: spacing.md, marginBottom: spacing.md, height: 120 },

  // Reminder
  reminderCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm,
  },
  reminderOptions: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    marginBottom: spacing.md, overflow: 'hidden', ...shadows.sm,
  },
  reminderOpt: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  reminderOptActive: { backgroundColor: colors.primaryLight },
  reminderOptText: { ...typography.body, color: colors.text },
  reminderOptTextActive: { color: colors.primary, fontWeight: '600' },

  // Color picker
  label: { ...typography.subhead, color: colors.textSecondary, marginBottom: spacing.sm },
  colorRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  colorDot: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  colorDotActive: { borderWidth: 3, borderColor: colors.surface, ...shadows.md },

  // Toggle card
  toggleCard: { backgroundColor: colors.surface, borderRadius: radius.lg, ...shadows.sm },
  toggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggleIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleLabel: { ...typography.body, color: colors.text },
});
