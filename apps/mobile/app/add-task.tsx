import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, isSameDay } from 'date-fns';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, typography, spacing, radius, categoryColors } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { Input } from '../src/components/ui/Input';
import { useTaskStore } from '../src/stores/taskStore';
import { useAuthStore } from '../src/stores/authStore';
import { useHouseholdStore } from '../src/stores/householdStore';
import { useAlert } from '../src/components/AlertProvider';

type Priority = 'low' | 'medium' | 'high';
type Category = 'personal' | 'household' | 'work' | 'errand';

const priorities: { value: Priority; label: string; color: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'low', label: 'Low', color: colors.success, icon: 'arrow-down-outline' },
  { value: 'medium', label: 'Medium', color: colors.warning, icon: 'remove-outline' },
  { value: 'high', label: 'High', color: colors.error, icon: 'arrow-up-outline' },
];

const categoryList: { value: Category; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'personal', label: 'Personal', icon: 'person-outline' },
  { value: 'household', label: 'Home', icon: 'home-outline' },
  { value: 'work', label: 'Work', icon: 'briefcase-outline' },
  { value: 'errand', label: 'Errand', icon: 'car-outline' },
];

export default function AddTaskScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { showAlert } = useAlert();
  const { addTask } = useTaskStore();
  const user = useAuthStore((s) => s.user);
  const { members } = useHouseholdStore();
  const { childId, childName } = useLocalSearchParams<{ childId?: string; childName?: string }>();
  const isChildTask = !!childId;
  const currentUser = { id: user?.id ?? '', name: user?.name ?? 'You', email: user?.email ?? '' };
  const partner = members.find((m) => m.id !== user?.id) ?? { id: '', name: 'Partner', email: '' };
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<Category>('personal');
  const [isShared, setIsShared] = useState(true);
  const [assignToPartner, setAssignToPartner] = useState(false);
  const [dueDate, setDueDate] = useState(new Date());
  const [dueTimeSet, setDueTimeSet] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const onDateChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setDueDate(date);
  };

  const onTimeChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (date) {
      setDueDate(date);
      setDueTimeSet(true);
    }
  };

  const handleSave = () => {
    if (!title.trim() || isSaving) return;
    Keyboard.dismiss();
    setIsSaving(true);
    // If this is a child task, assign to child; otherwise assign to partner or self
    const resolvedAssignedTo = isChildTask
      ? (childId as string)
      : assignToPartner ? partner.id : currentUser.id;
    addTask({
      title: title.trim(),
      description: description.trim() || undefined, completed: false,
      dueDate: format(dueDate, "yyyy-MM-dd'T'HH:mm:ss"), priority, category,
      assignedTo: resolvedAssignedTo,
      createdBy: currentUser.id, shared: isShared,
    });
    router.canGoBack() ? router.back() : router.replace('/(tabs)' as any);
  };

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)}
          style={styles.headerBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isChildTask ? `Task for ${childName ?? 'Child'}` : 'New Task'}</Text>
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
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <Input label="What needs to be done?" placeholder="Enter task title" value={title} onChangeText={setTitle} />
          <Input label="Notes" placeholder="Add details..." value={description} onChangeText={setDescription} multiline numberOfLines={3} style={styles.textArea} />

          {/* Due Date */}
          <TouchableOpacity
            style={styles.datePickerBtn}
            onPress={() => setShowDatePicker(!showDatePicker)}
            activeOpacity={0.7}
          >
            <View style={styles.datePickerLeft}>
              <View style={[styles.datePickerIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.datePickerLabel}>Due date</Text>
                <Text style={styles.datePickerValue}>{format(dueDate, 'EEE, MMM d, yyyy')}</Text>
              </View>
            </View>
            <Ionicons name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker themeVariant="light"
              value={dueDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
              style={{ marginBottom: spacing.md }}
            />
          )}

          {/* Due Time */}
          <TouchableOpacity
            style={styles.datePickerBtn}
            onPress={() => setShowTimePicker(!showTimePicker)}
            activeOpacity={0.7}
          >
            <View style={styles.datePickerLeft}>
              <View style={[styles.datePickerIcon, { backgroundColor: colors.errorLight }]}>
                <Ionicons name="time-outline" size={16} color={colors.error} />
              </View>
              <View>
                <Text style={styles.datePickerLabel}>Due time</Text>
                <Text style={styles.datePickerValue}>{dueTimeSet ? format(dueDate, 'h:mm a') : 'Set time'}</Text>
              </View>
            </View>
            <Ionicons name={showTimePicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker themeVariant="light"
              value={dueDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
              minimumDate={isSameDay(dueDate, new Date()) ? new Date() : undefined}
              style={{ marginBottom: spacing.md }}
            />
          )}

          {/* Priority */}
          <Text style={styles.label}>Priority</Text>
          <View style={styles.chips}>
            {priorities.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[styles.chip, priority === p.value && { backgroundColor: p.color, borderColor: p.color }]}
                onPress={() => setPriority(p.value)}
              >
                <Ionicons name={p.icon} size={14} color={priority === p.value ? '#fff' : p.color} />
                <Text style={[styles.chipText, priority === p.value && styles.chipTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <View style={styles.chips}>
            {categoryList.map((c) => {
              const cc = categoryColors[c.value] || categoryColors.other;
              const isActive = category === c.value;
              return (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.chip, isActive && { backgroundColor: cc.icon, borderColor: cc.icon }]}
                  onPress={() => setCategory(c.value)}
                >
                  <Ionicons name={c.icon} size={14} color={isActive ? '#fff' : cc.icon} />
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Assignment */}
          {isChildTask ? (
            <View style={[styles.toggleCard, styles.childAssignBanner]}>
              <View style={[styles.toggleIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="happy-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.toggleLabel, { flex: 1 }]}>
                Assigned to <Text style={{ color: colors.primary, fontWeight: '700' }}>{childName ?? 'Child'}</Text>
              </Text>
            </View>
          ) : (
            <View style={styles.toggleCard}>
              <View style={styles.toggle}>
                <View style={styles.toggleLeft}>
                  <View style={[styles.toggleIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="people-outline" size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.toggleLabel}>Shared task</Text>
                </View>
                <Switch value={isShared} onValueChange={setIsShared} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
              </View>
              {partner.id ? (
                <>
                  <View style={styles.toggleDivider} />
                  <View style={styles.toggle}>
                    <View style={styles.toggleLeft}>
                      <View style={[styles.toggleIcon, { backgroundColor: colors.warningLight }]}>
                        <Ionicons name="person-outline" size={18} color={colors.warning} />
                      </View>
                      <Text style={styles.toggleLabel}>Assign to {partner.name}</Text>
                    </View>
                    <Switch value={assignToPartner} onValueChange={setAssignToPartner} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
                  </View>
                </>
              ) : null}
            </View>
          )}
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
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  headerBtn: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xs, minWidth: 60 },
  cancelText: { ...typography.body },
  headerTitle: { ...typography.headline, color: colors.text, flex: 1, textAlign: 'center' },
  saveBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md, minWidth: 60, alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.border },
  saveBtnText: { ...typography.callout, color: '#fff', fontWeight: '700' },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  textArea: { height: 80, textAlignVertical: 'top', paddingTop: spacing.md },
  datePickerBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm,
  },
  datePickerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  datePickerIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  datePickerLabel: { ...typography.caption1, color: colors.textTertiary },
  datePickerValue: { ...typography.body, color: colors.text, marginTop: 1 },
  label: { ...typography.subhead, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
  },
  chipText: { ...typography.subhead, color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
  toggleCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight, marginTop: spacing.sm,
  },
  childAssignBanner: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.md, padding: spacing.lg,
  },
  toggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg,
  },
  toggleDivider: { height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggleIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleLabel: { ...typography.body, color: colors.text },
});
