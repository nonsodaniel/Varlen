import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import {
  typography,
  spacing,
  radius,
} from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { usePollStore } from '../src/stores/pollStore';
import { useAuthStore } from '../src/stores/authStore';
import { useAlert } from '../src/components/AlertProvider';

const emojiChoices = [
  '\uD83D\uDE0A', '\uD83D\uDE0E', '\uD83C\uDF89', '\uD83D\uDD25',
  '\u2764\uFE0F', '\uD83C\uDF1F', '\uD83D\uDE80', '\uD83C\uDF55',
];

interface PollOptionDraft {
  id: string;
  emoji: string | null;
  label: string;
}

export default function CreatePollScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { showAlert } = useAlert();
  const user = useAuthStore((s) => s.user);
  const currentUser = { id: user?.id ?? '', name: user?.name ?? 'You', email: user?.email ?? '' };
  const { addPoll } = usePollStore();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<PollOptionDraft[]>([
    { id: '1', emoji: null, label: '' },
    { id: '2', emoji: null, label: '' },
  ]);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canCreate =
    question.trim().length > 0 &&
    options.every((o) => o.label.trim().length > 0) &&
    !isSaving;

  const addOption = () => {
    if (options.length >= 4) return;
    const newId = String(Date.now());
    setOptions((prev) => [
      ...prev,
      {
        id: newId,
        emoji: null,
        label: '',
      },
    ]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const updateOptionLabel = (id: string, label: string) => {
    setOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, label } : o))
    );
  };

  const updateOptionEmoji = (id: string, emoji: string | null) => {
    setOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, emoji } : o))
    );
    setEmojiPickerFor(null);
  };

  const handleCreate = async () => {
    if (isSaving) return;
    Keyboard.dismiss();
    setIsSaving(true);
    try {
      await addPoll({
        question: question.trim(),
        options: options.map((o, i) => ({
          id: `opt-${i}`,
          label: o.label.trim(),
          ...(o.emoji ? { emoji: o.emoji } : {}),
          votes: [],
        })),
        createdBy: currentUser.id,
      });

      showAlert('Poll Created!', `"${question.trim()}" is now live.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      showAlert('Error', 'Could not create poll. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Poll</Text>
        <TouchableOpacity
          style={[styles.createHeaderBtn, !canCreate && styles.createHeaderBtnDisabled]}
          onPress={canCreate ? handleCreate : undefined}
          disabled={!canCreate}
          activeOpacity={0.8}
        >
          <Text style={[styles.createHeaderBtnText, !canCreate && { color: colors.textTertiary }]}>
            {isSaving ? 'Creating…' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Question */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Question</Text>
          <TextInput
            style={styles.questionInput}
            value={question}
            onChangeText={setQuestion}
            placeholder="What do you want to ask?"
            placeholderTextColor={colors.textTertiary}
            multiline
          />
        </View>

        {/* Options */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Options</Text>
          {options.map((option) => (
            <View key={option.id} style={styles.optionCard}>
              <TouchableOpacity
                style={[styles.emojiBtn, !option.emoji && styles.emojiBtnEmpty]}
                activeOpacity={0.7}
                onPress={() =>
                  setEmojiPickerFor(
                    emojiPickerFor === option.id ? null : option.id
                  )
                }
              >
                {option.emoji ? (
                  <Text style={styles.emojiBtnText}>{option.emoji}</Text>
                ) : (
                  <Ionicons name="happy-outline" size={20} color={colors.textTertiary} />
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.optionInput}
                value={option.label}
                onChangeText={(text) => updateOptionLabel(option.id, text)}
                placeholder="Option label"
                placeholderTextColor={colors.textTertiary}
              />

              {options.length > 2 && (
                <TouchableOpacity
                  onPress={() => removeOption(option.id)}
                  activeOpacity={0.7}
                  style={styles.removeBtn}
                >
                  <Ionicons
                    name="close-circle"
                    size={22}
                    color={colors.error}
                  />
                </TouchableOpacity>
              )}

              {/* Emoji picker */}
              {emojiPickerFor === option.id && (
                <View style={styles.emojiPicker}>
                  {option.emoji && (
                    <TouchableOpacity
                      style={[styles.emojiPickerItem, styles.emojiPickerItemRemove]}
                      activeOpacity={0.7}
                      onPress={() => updateOptionEmoji(option.id, null)}
                    >
                      <Ionicons name="close" size={16} color={colors.error} />
                    </TouchableOpacity>
                  )}
                  {emojiChoices.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.emojiPickerItem,
                        option.emoji === emoji && styles.emojiPickerItemSelected,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => updateOptionEmoji(option.id, emoji)}
                    >
                      <Text style={styles.emojiPickerText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}

          {options.length < 4 && (
            <TouchableOpacity
              style={styles.addOptionBtn}
              activeOpacity={0.7}
              onPress={addOption}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.addOptionText}>Add option</Text>
            </TouchableOpacity>
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
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cancelBtn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    minWidth: 60,
  },
  cancelText: {
    ...typography.body,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  createHeaderBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    minWidth: 70,
    alignItems: 'center',
  },
  createHeaderBtnDisabled: {
    backgroundColor: colors.border,
  },
  createHeaderBtnText: {
    ...typography.callout,
    fontWeight: '700',
    color: colors.textInverse,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },

  // Section
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

  // Question
  questionInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...typography.body,
    color: colors.text,
    minHeight: 60,
    ...shadows.sm,
  },

  // Options
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    ...shadows.sm,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  emojiBtnEmpty: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  emojiBtnText: {
    fontSize: 22,
  },
  optionInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 0,
  },
  removeBtn: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  emojiPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    marginTop: spacing.sm,
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  emojiPickerItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  emojiPickerItemSelected: {
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  emojiPickerItemRemove: {
    borderWidth: 1.5,
    borderColor: colors.error,
    borderStyle: 'dashed',
  },
  emojiPickerText: {
    fontSize: 20,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  addOptionText: {
    ...typography.callout,
    color: colors.primary,
  },

});
