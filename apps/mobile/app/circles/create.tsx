import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { spacing, radius } from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { EmojiPicker } from '../../src/components/ui/EmojiPicker';
import { useCircleStore } from '../../src/stores/circleStore';
import { useModeStore } from '../../src/stores/modeStore';
import { useAlert } from '../../src/components/AlertProvider';

const ALL_CIRCLE_TYPES = [
  { value: 'EXTENDED', label: 'Family', description: 'Parents, siblings, relatives', emoji: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67' },
  { value: 'FRIENDS', label: 'Friends', description: 'Close friends, friend groups', emoji: '\uD83D\uDC9C' },
  { value: 'CUSTOM', label: 'Other', description: 'Neighbors, coworkers, etc.', emoji: '\u2728' },
];

const MODE_CIRCLE_TYPES: Record<string, string[]> = {
  couple: ['EXTENDED'],
  family: ['EXTENDED'],
  parenting: ['EXTENDED'],
  single: ['FRIENDS', 'EXTENDED', 'CUSTOM'],
};

const CIRCLE_EMOJIS = ['\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67', '\uD83D\uDC9C', '\u2728', '\uD83C\uDFE0', '\uD83C\uDF1F', '\uD83C\uDF08', '\uD83C\uDF3B', '\uD83E\uDD1D', '\uD83C\uDF89', '\u2764\uFE0F', '\uD83D\uDE80', '\uD83C\uDFA8'];

const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#EF4444', '#6366F1'];

export default function CreateCircleScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { createCircle } = useCircleStore();
  const { mode } = useModeStore();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const allowedTypes = MODE_CIRCLE_TYPES[mode] || MODE_CIRCLE_TYPES.single;
  const circleTypes = ALL_CIRCLE_TYPES.filter((ct) => allowedTypes.includes(ct.value));

  const [name, setName] = useState('');
  const [type, setType] = useState(circleTypes[0]?.value || 'CUSTOM');
  const [emoji, setEmoji] = useState(CIRCLE_EMOJIS[0]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      showAlert('Name Required', 'Please enter a name for your circle.');
      return;
    }

    setIsSubmitting(true);
    try {
      const circle = await createCircle({
        name: name.trim(),
        type,
        emoji,
        color: selectedColor,
      });

      if (circle) {
        router.back();
      } else {
        showAlert('Error', 'Failed to create circle. Please try again.');
      }
    } catch {
      showAlert('Error', 'Failed to create circle. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Create Circle</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Explanation */}
        <Text style={styles.subtitle}>
          A circle is a group of people you share things with — like a family group or close friends.
        </Text>

        <View style={styles.section}>
          <Text style={styles.label}>Circle Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., My Family, Close Friends"
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>What kind of circle?</Text>
          {circleTypes.map((ct) => (
            <TouchableOpacity
              key={ct.value}
              style={[styles.typeCard, type === ct.value && { borderColor: colors.primary, borderWidth: 2 }]}
              onPress={() => setType(ct.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.typeEmoji}>{ct.emoji}</Text>
              <View style={styles.typeContent}>
                <Text style={styles.typeLabel}>{ct.label}</Text>
                <Text style={styles.typeDesc}>{ct.description}</Text>
              </View>
              {type === ct.value && (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Pick an icon</Text>
          <EmojiPicker options={CIRCLE_EMOJIS} selected={emoji} onSelect={setEmoji} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotActive]}
                onPress={() => setSelectedColor(c)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              />
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createBtn, isSubmitting && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={isSubmitting}
        >
          <Text style={styles.createBtnText}>
            {isSubmitting ? 'Creating...' : 'Create Circle'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: 24 },
  section: { gap: 10 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    ...shadows.sm,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  typeEmoji: { fontSize: 24 },
  typeContent: { flex: 1 },
  typeLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  typeDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  colorDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: colors.text,
  },
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 40,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
