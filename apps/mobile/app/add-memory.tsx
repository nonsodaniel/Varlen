import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '../src/constants/theme';
import { Input } from '../src/components/ui/Input';
import { useMemoryStore } from '../src/stores/memoryStore';
import { currentUser } from '../src/data/mock';

const emojiOptions = ['❤️', '🎉', '🌅', '🍽️', '✈️', '🎂', '🏠', '🎵', '📸', '🌸', '⭐', '🎁'];

export default function AddMemoryScreen() {
  const router = useRouter();
  const { addMemory } = useMemoryStore();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<string>(emojiOptions[0]);

  const handleSave = () => {
    if (!title.trim()) return;
    addMemory({
      id: 'memory-' + Date.now(),
      title: title.trim(),
      description: notes.trim() || undefined,
      emoji: selectedEmoji,
      date: new Date().toISOString().split('T')[0],
      type: 'milestone',
      createdBy: currentUser.id,
      shared: true,
    });
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Memory</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!title.trim()}
          style={[styles.saveBtn, !title.trim() && styles.saveBtnDisabled]}
          activeOpacity={0.7}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Input label="Title" placeholder="What happened?" value={title} onChangeText={setTitle} autoFocus />

          {/* Emoji Selector */}
          <Text style={styles.label}>Emoji</Text>
          <View style={styles.emojiGrid}>
            {emojiOptions.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.emojiCircle,
                  selectedEmoji === emoji && styles.emojiCircleActive,
                ]}
                onPress={() => setSelectedEmoji(emoji)}
                activeOpacity={0.7}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Notes"
            placeholder="Tell the story..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    ...shadows.sm,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    ...typography.subhead,
    color: colors.textInverse,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['3xl'],
  },

  // Emoji selector
  label: {
    ...typography.subhead,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  emojiCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  emojiCircleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    ...shadows.md,
  },
  emojiText: {
    fontSize: 22,
  },

  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
});
