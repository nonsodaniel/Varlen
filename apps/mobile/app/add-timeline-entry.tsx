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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  typography,
  spacing,
  radius,
} from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useTimelineStore } from '../src/stores/timelineStore';
import { useAuthStore } from '../src/stores/authStore';
import { useModeStore } from '../src/stores/modeStore';
import { useAlert } from '../src/components/AlertProvider';

const emojiGrid = [
  '\uD83C\uDF89', '\uD83C\uDF93', '\uD83C\uDFE0', '\uD83D\uDE97',
  '\uD83D\uDC8D', '\uD83D\uDC76', '\uD83C\uDF82', '\u2708\uFE0F',
  '\uD83C\uDFC6', '\uD83D\uDCBC', '\uD83C\uDF1F', '\u2764\uFE0F',
];

type Category = 'milestone' | 'achievement' | 'event' | 'memory';

const categories: { value: Category; label: string }[] = [
  { value: 'milestone', label: 'Milestone' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'event', label: 'Event' },
  { value: 'memory', label: 'Memory' },
];

export default function AddTimelineEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { showAlert } = useAlert();
  const user = useAuthStore((s) => s.user);
  const currentUser = { id: user?.id ?? '', name: user?.name ?? 'You', email: user?.email ?? '' };
  const { addEntry } = useTimelineStore();
  const mode = useModeStore((s) => s.mode);

  const [selectedEmoji, setSelectedEmoji] = useState(emojiGrid[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('milestone');
  const [entryDate, setEntryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const onDateChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setEntryDate(date);
  };

  const canSave = title.trim().length > 0;

  const handleSave = async () => {
    Keyboard.dismiss();
    try {
      await addEntry({
        title: title.trim(),
        description: description.trim() || undefined,
        emoji: selectedEmoji,
        date: format(entryDate, 'yyyy-MM-dd'),
        category: selectedCategory,
        createdBy: currentUser.id,
        mode,
      });

      showAlert('Milestone saved!', `"${title.trim()}" added to your timeline.`, [
        { text: 'OK', onPress: () => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any) },
      ]);
    } catch {
      showAlert('Error', 'Could not save milestone. Please try again.');
    }
  };

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Milestone</Text>
        <TouchableOpacity
          style={[styles.headerSaveBtn, !canSave && styles.headerSaveBtnDisabled]}
          onPress={canSave ? handleSave : undefined}
          disabled={!canSave}
          activeOpacity={0.8}
        >
          <Text style={styles.headerSaveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Emoji selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Icon</Text>
          <View style={styles.emojiGrid}>
            {emojiGrid.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.emojiItem,
                  selectedEmoji === emoji && styles.emojiItemSelected,
                ]}
                activeOpacity={0.7}
                onPress={() => setSelectedEmoji(emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Title</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="What happened?"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description (optional)</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Add more details..."
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Category selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.categoryRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryPill,
                  selectedCategory === cat.value && styles.categoryPillSelected,
                ]}
                activeOpacity={0.7}
                onPress={() => setSelectedCategory(cat.value)}
              >
                <Text
                  style={[
                    styles.categoryLabel,
                    selectedCategory === cat.value &&
                      styles.categoryLabelSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date picker */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>When did this happen?</Text>
          <TouchableOpacity
            style={styles.datePickerBtn}
            onPress={() => setShowDatePicker(!showDatePicker)}
            activeOpacity={0.7}
          >
            <View style={styles.datePickerLeft}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={styles.datePickerValue}>{format(entryDate, 'EEE, MMM d, yyyy')}</Text>
            </View>
            <Ionicons name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker themeVariant="light"
              value={entryDate}
              mode="date"
              maximumDate={new Date()}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={onDateChange}
            />
          )}
        </View>

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  closeBtn: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xs, minWidth: 60 },
  cancelText: { ...typography.body },
  headerTitle: { ...typography.headline, color: colors.text, flex: 1, textAlign: 'center' },
  headerSaveBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderRadius: radius.md, minWidth: 60, alignItems: 'center',
  },
  headerSaveBtnDisabled: { backgroundColor: colors.border },
  headerSaveBtnText: { ...typography.callout, color: colors.textInverse, fontWeight: '700' },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },

  // Sections
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    ...typography.subhead,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Emoji grid
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  emojiItem: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  emojiItemSelected: {
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  emojiText: {
    fontSize: 26,
  },

  // Title input
  titleInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...typography.body,
    color: colors.text,
    ...shadows.sm,
  },

  // Description input
  descriptionInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...typography.body,
    color: colors.text,
    minHeight: 100,
    ...shadows.sm,
  },

  // Category selector
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  categoryPillSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  categoryLabel: {
    ...typography.callout,
    color: colors.textSecondary,
  },
  categoryLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Date picker
  datePickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  datePickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  datePickerValue: {
    ...typography.body,
    color: colors.text,
  },

  // Save button
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  saveBtnDisabled: {
    backgroundColor: colors.textTertiary,
  },
  saveBtnText: {
    ...typography.headline,
    color: colors.textInverse,
  },
});
