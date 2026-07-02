import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
} from '../src/constants/theme';
import { useTimelineStore } from '../src/stores/timelineStore';
import { currentUser } from '../src/data/mock';

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
  const { addEntry } = useTimelineStore();

  const [selectedEmoji, setSelectedEmoji] = useState(emojiGrid[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('milestone');

  const canSave = title.trim().length > 0;

  const handleSave = () => {
    const entryId = `tl-${Date.now()}`;
    addEntry({
      id: entryId,
      title: title.trim(),
      description: description.trim() || undefined,
      emoji: selectedEmoji,
      date: format(new Date(), 'yyyy-MM-dd'),
      category: selectedCategory,
      createdBy: currentUser.id,
    });

    Alert.alert('Milestone saved!', `"${title.trim()}" added to your timeline.`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Milestone</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
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

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          activeOpacity={canSave ? 0.7 : 1}
          onPress={canSave ? handleSave : undefined}
          disabled={!canSave}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
  },
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
