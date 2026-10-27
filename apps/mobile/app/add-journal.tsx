import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useJournalStore } from '../src/stores/journalStore';
import { useAuthStore } from '../src/stores/authStore';
import { useAlert } from '../src/components/AlertProvider';

export default function AddJournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { showAlert } = useAlert();
  const user = useAuthStore((s) => s.user);
  const { addEntry } = useJournalStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const contentRef = useRef<TextInput>(null);

  const canSave = content.trim().length > 0 && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;
    Keyboard.dismiss();
    setIsSaving(true);
    try {
      await addEntry({
        date: format(new Date(), 'yyyy-MM-dd'),
        title: title.trim(),
        note: content.trim(),
        createdBy: user?.id ?? '',
      });
      router.canGoBack() ? router.back() : router.replace('/(tabs)' as any);
    } catch {
      showAlert('Error', 'Could not save entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} style={styles.cancelBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.dateLabel}>{format(new Date(), 'EEEE, MMMM d')}</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            activeOpacity={0.7}
          >
            <Text style={[styles.saveBtnText, !canSave && styles.saveBtnTextDisabled]}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView keyboardDismissMode="on-drag"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Optional title */}
          <TextInput
            style={styles.titleInput}
            placeholder="Title (optional)"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
            returnKeyType="next"
            onSubmitEditing={() => contentRef.current?.focus()}
            maxLength={200}
          />

          <View style={styles.divider} />

          {/* Main content */}
          <TextInput
            ref={contentRef}
            style={styles.contentInput}
            placeholder="Write anything..."
            placeholderTextColor={colors.textTertiary}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            autoFocus
            maxLength={10000}
          />

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Word count */}
        {content.length > 0 && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
            <Text style={styles.wordCount}>
              {content.trim().split(/\s+/).filter(Boolean).length} words
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: {
    ...typography.callout,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
  saveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.surface },
  saveBtnText: { ...typography.callout, color: '#fff', fontWeight: '700' },
  saveBtnTextDisabled: { color: colors.textTertiary },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  titleInput: {
    ...typography.title2,
    color: colors.text,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  contentInput: {
    ...typography.body,
    color: colors.text,
    lineHeight: 26,
    minHeight: 300,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  wordCount: {
    ...typography.caption2,
    color: colors.textTertiary,
  },
});
