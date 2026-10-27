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
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, differenceInMonths, differenceInYears } from 'date-fns';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useHouseholdStore, getResolvedHouseholdId } from '../src/stores/householdStore';
import { apiPost } from '../src/services/api';
import { useAlert } from '../src/components/AlertProvider';
import { haptics } from '../src/hooks/useHaptics';

const CHILD_COLORS = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B',
  '#EC4899', '#EF4444', '#06B6D4', '#F97316',
];


export default function AddChildScreen() {
  const router = useRouter();
  const { colors, shadows, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { showAlert } = useAlert();
  const fetchHousehold = useHouseholdStore((s) => s.fetchHousehold);

  const [name, setName] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState(CHILD_COLORS[0]);
  const [schoolName, setSchoolName] = useState('');
  const [bedtime, setBedtime] = useState('');
  const [showBedtimePicker, setShowBedtimePicker] = useState(false);
  const [bedtimeDate, setBedtimeDate] = useState<Date>(() => {
    const d = new Date(); d.setHours(20, 0, 0, 0); return d;
  });
  const [allergies, setAllergies] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const ageLabel = useMemo(() => {
    if (!dob) return null;
    const months = differenceInMonths(new Date(), dob);
    if (months < 24) return `${months} month${months !== 1 ? 's' : ''} old`;
    const years = differenceInYears(new Date(), dob);
    return `${years} year${years !== 1 ? 's' : ''} old`;
  }, [dob]);

  const onDobChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDobPicker(false);
    if (date) setDob(date);
  };

  const onBedtimeChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowBedtimePicker(false);
    if (date) {
      setBedtimeDate(date);
      setBedtime(format(date, 'h:mm a'));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert('Name required', "Please enter your child's name.");
      return;
    }
    if (!dob) {
      showAlert('Date of birth required', "Please enter your child's date of birth.");
      return;
    }
    Keyboard.dismiss();
    setSaving(true);
    try {
      const hid = getResolvedHouseholdId();
      if (!hid) throw new Error('No household found');

      const body: Record<string, unknown> = {
        name: name.trim(),
        dateOfBirth: format(dob, 'yyyy-MM-dd'),
        color: selectedColor,
        ...(schoolName.trim() && { schoolName: schoolName.trim() }),
        ...(bedtime && { bedtime }),
        ...(allergies.trim() && { allergies: allergies.split(',').map((a) => a.trim()).filter(Boolean) }),
        ...(notes.trim() && { notes: notes.trim() }),
      };

      const newChild = await apiPost<{ id: string }>(`/households/${hid}/children`, body);
      haptics.success();
      // Refresh household so children list updates everywhere
      await fetchHousehold();
      // Navigate directly to the kid tracker for the newly created child
      const childId = (newChild as any)?.id ?? (newChild as any)?.data?.id;
      if (childId) {
        router.replace(`/parenting-tracker?childId=${childId}` as any);
      } else {
        router.replace('/(tabs)/people' as any);
      }
    } catch (err) {
      console.warn('[add-child] save failed:', err);
      showAlert('Could not save', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/people' as any)}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Add Child</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!name.trim() || !dob || saving}
          style={[styles.saveBtn, { backgroundColor: selectedColor }, (!name.trim() || !dob || saving) && { opacity: 0.45 }]}
          activeOpacity={0.7}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardDismissMode="on-drag"
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar preview */}
          <View style={styles.avatarPreviewRow}>
            <View style={[styles.avatarPreview, { backgroundColor: selectedColor }]}>
              <Text style={styles.avatarInitial}>{name.trim() ? name.trim()[0].toUpperCase() : '?'}</Text>
            </View>
            <View>
              <Text style={[styles.avatarName, { color: colors.text }]}>{name.trim() || 'Child name'}</Text>
              {ageLabel && <Text style={[styles.avatarAge, { color: colors.textSecondary }]}>{ageLabel}</Text>}
            </View>
          </View>

          {/* Name */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Name <Text style={{ color: colors.error }}>*</Text></Text>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.borderLight }]}
            placeholder="e.g. Emma, Liam, Zara..."
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            returnKeyType="next"
          />

          {/* Date of Birth */}
          <View style={[styles.dateTimeCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
            <TouchableOpacity
              style={styles.dateTimeRow}
              onPress={() => setShowDobPicker((v) => !v)}
              activeOpacity={0.7}
            >
              <View style={styles.dateTimeLeft}>
                <View style={[styles.dtIcon, { backgroundColor: selectedColor + '20' }]}>
                  <Ionicons name="calendar-outline" size={16} color={selectedColor} />
                </View>
                <View>
                  <Text style={[styles.dtLabel, { color: colors.textTertiary }]}>
                    Date of Birth <Text style={{ color: colors.error }}>*</Text>
                  </Text>
                  <Text style={[styles.dtValue, { color: dob ? colors.text : colors.textTertiary }]}>
                    {dob ? format(dob, 'MMMM d, yyyy') : 'Select date of birth'}
                  </Text>
                </View>
              </View>
              <Ionicons name={showDobPicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            {showDobPicker && (
              <DateTimePicker
                value={dob ?? new Date()}
                mode="date"
                maximumDate={new Date()}
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={onDobChange}
                themeVariant={isDark ? 'dark' : 'light'}
              />
            )}
          </View>

          {/* Avatar color */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Avatar Color</Text>
          <View style={styles.colorGrid}>
            {CHILD_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => { haptics.selection(); setSelectedColor(c); }}
                activeOpacity={0.8}
                style={[styles.colorSwatch, { backgroundColor: c }, selectedColor === c && styles.colorSwatchActive]}
              >
                {selectedColor === c && <Ionicons name="checkmark" size={18} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>

          {/* School */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>School <Text style={[styles.optional, { color: colors.textTertiary }]}>(optional)</Text></Text>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.borderLight }]}
            placeholder="School or nursery name"
            placeholderTextColor={colors.textTertiary}
            value={schoolName}
            onChangeText={setSchoolName}
            returnKeyType="next"
          />

          {/* Bedtime */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Bedtime <Text style={[styles.optional, { color: colors.textTertiary }]}>(optional)</Text></Text>
          <View style={[styles.pickerCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <View style={styles.pickerCardRow}>
              <View style={[styles.pickerCardIcon, { backgroundColor: selectedColor + '20' }]}>
                <Ionicons name="moon-outline" size={18} color={selectedColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickerCardTitle, { color: colors.text }]}>Set bedtime reminder</Text>
                <Text style={[styles.pickerCardSub, { color: colors.textTertiary }]}>
                  {bedtime || 'Not set'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  haptics.selection();
                  if (bedtime) {
                    setBedtime('');
                    setShowBedtimePicker(false);
                  } else {
                    setBedtime(format(bedtimeDate, 'h:mm a'));
                    setShowBedtimePicker(true);
                  }
                }}
                activeOpacity={0.7}
                style={[styles.toggleSmall, { backgroundColor: bedtime ? selectedColor : colors.border }]}
              >
                <View style={[styles.toggleKnob, { transform: [{ translateX: bedtime ? 16 : 2 }] }]} />
              </TouchableOpacity>
            </View>
            {showBedtimePicker && (
              <>
                <View style={[styles.dividerThin, { backgroundColor: colors.borderLight }]} />
                <DateTimePicker
                  value={bedtimeDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onBedtimeChange}
                  themeVariant={isDark ? 'dark' : 'light'}
                />
              </>
            )}
          </View>

          {/* Allergies */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Allergies <Text style={[styles.optional, { color: colors.textTertiary }]}>(optional, comma separated)</Text></Text>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.borderLight }]}
            placeholder="e.g. Peanuts, Dairy, Eggs"
            placeholderTextColor={colors.textTertiary}
            value={allergies}
            onChangeText={setAllergies}
            returnKeyType="next"
          />

          {/* Notes */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Notes <Text style={[styles.optional, { color: colors.textTertiary }]}>(optional)</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.borderLight }]}
            placeholder="Any other info (doctor, emergency contacts, special needs...)"
            placeholderTextColor={colors.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  saveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    ...typography.callout,
    color: '#fff',
    fontWeight: '700',
  },
  content: {
    padding: spacing.xl,
    paddingBottom: 48,
  },
  // Avatar preview
  avatarPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
  },
  avatarPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  avatarName: {
    ...typography.title3,
    fontWeight: '700',
  },
  avatarAge: {
    ...typography.subhead,
    marginTop: 2,
  },
  // Form
  label: {
    ...typography.subhead,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
  },
  optional: {
    fontWeight: '400',
    fontSize: 12,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
    fontSize: 16,
  },
  textArea: {
    height: 90,
    paddingTop: spacing.md,
  },
  // Date of birth card (add-event style)
  dateTimeCard: {
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    marginTop: spacing.xl,
    overflow: 'hidden',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dateTimeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dtIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dtLabel: {
    ...typography.caption1,
  },
  dtValue: {
    ...typography.body,
    marginTop: 1,
  },
  // Date / time picker trigger
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  pickerBtnText: {
    flex: 1,
    ...typography.body,
    fontSize: 16,
  },
  // Color swatch grid
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchActive: {
    transform: [{ scale: 1.2 }],
  },
  // Bedtime card
  pickerCard: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  pickerCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  pickerCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCardTitle: {
    ...typography.subhead,
    fontWeight: '600',
  },
  pickerCardSub: {
    ...typography.caption1,
    marginTop: 2,
  },
  toggleSmall: {
    width: 36,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  dividerThin: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
  },
});
