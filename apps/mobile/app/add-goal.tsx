import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { Input } from '../src/components/ui/Input';
import { useGoalStore } from '../src/stores/goalStore';
import { useAuthStore } from '../src/stores/authStore';
import { useAlert } from '../src/components/AlertProvider';

const colorOptions = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444', '#06B6D4', '#F97316'];

export default function AddGoalScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { showAlert } = useAlert();
  const user = useAuthStore((s) => s.user);
  const { addGoal } = useGoalStore();
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');
  const [deadline, setDeadline] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const onDateChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      setDeadline(date);
      setErrors((e) => ({ ...e, deadline: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Give your goal a name';
    if (!target.trim() || isNaN(Number(target))) newErrors.target = 'Enter a number';
    if (!unit.trim()) newErrors.unit = 'What are you counting?';
    if (deadline <= new Date()) newErrors.deadline = 'Pick a future date';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || isSaving) return;
    Keyboard.dismiss();
    setIsSaving(true);
    try {
      await addGoal({
        title: title.trim(),
        progress: 0,
        target: parseInt(target, 10),
        unit: unit.trim(),
        deadline: deadline.toISOString().split('T')[0],
        color: selectedColor,
        createdBy: user?.id ?? '',
      });
      router.back();
    } catch {
      showAlert('Error', 'Could not save goal. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = title.trim() && target.trim() && unit.trim() && !isSaving;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Goal</Text>
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
          <Text style={styles.label}>What do you want to achieve?</Text>
          <Input
            placeholder="e.g. Read more books"
            value={title}
            onChangeText={(t) => { setTitle(t); setErrors((e) => ({ ...e, title: '' })); }}
            error={errors.title}
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Target</Text>
              <Input
                placeholder="e.g. 12"
                value={target}
                onChangeText={(t) => { setTarget(t); setErrors((e) => ({ ...e, target: '' })); }}
                keyboardType="numeric"
                error={errors.target}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Unit</Text>
              <Input
                placeholder="e.g. books"
                value={unit}
                onChangeText={(u) => { setUnit(u); setErrors((e) => ({ ...e, unit: '' })); }}
                error={errors.unit}
              />
            </View>
          </View>

          <Text style={styles.label}>Deadline</Text>
          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => setShowDatePicker(!showDatePicker)}
            activeOpacity={0.7}
          >
            <View style={styles.dateLeft}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={styles.dateText}>{format(deadline, 'MMMM d, yyyy')}</Text>
            </View>
            <Ionicons name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          {errors.deadline ? <Text style={styles.errorText}>{errors.deadline}</Text> : null}
          {showDatePicker && (
            <DateTimePicker
              value={deadline}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={onDateChange}
            />
          )}

          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {colorOptions.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  selectedColor === c && styles.colorDotActive,
                ]}
                onPress={() => setSelectedColor(c)}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                {selectedColor === c && (
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: spacing['3xl'] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
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
  label: {
    ...typography.headline, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.lg,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  halfField: { flex: 1 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  dateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateText: {
    ...typography.body,
    color: colors.text,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  colorRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md,
  },
  colorDot: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  colorDotActive: {
    borderWidth: 3, borderColor: '#FFF',
    ...shadows.md,
  },
});
