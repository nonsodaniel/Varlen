import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { Input } from '../src/components/ui/Input';
import { EmojiPicker } from '../src/components/ui/EmojiPicker';
import { useMemoryStore } from '../src/stores/memoryStore';
import { useAuthStore } from '../src/stores/authStore';
import { useAlert } from '../src/components/AlertProvider';

const emojiOptions = ['\u2764\uFE0F', '\uD83C\uDF89', '\uD83C\uDF05', '\uD83C\uDF7D\uFE0F', '\u2708\uFE0F', '\uD83C\uDF82', '\uD83C\uDFE0', '\uD83C\uDFB5', '\uD83D\uDCF8', '\uD83C\uDF38', '\u2B50', '\uD83C\uDF81'];

export default function AddMemoryScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { showAlert } = useAlert();
  const user = useAuthStore((s) => s.user);
  const currentUser = { id: user?.id ?? '', name: user?.name ?? 'You', email: user?.email ?? '' };
  const { addMemory } = useMemoryStore();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<string>(emojiOptions[0]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [memoryDate, setMemoryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const onDateChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setMemoryDate(date);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission needed', 'Please allow photo library access to add images to your memories.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission needed', 'Please allow camera access to take photos for your memories.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    showAlert('Add Photo', 'Choose how to add a photo', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickImage },
      ...(imageUri ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: () => setImageUri(null) }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    Keyboard.dismiss();
    setIsSaving(true);
    try {
      await addMemory(
        {
          title: title.trim(),
          description: notes.trim() || undefined,
          emoji: selectedEmoji,
          date: format(memoryDate, 'yyyy-MM-dd'),
          type: imageUri ? 'photo' : 'milestone',
          createdBy: currentUser.id,
          shared: true,
        },
        imageUri ?? undefined,
      );
      router.back();
    } catch {
      showAlert('Error', 'Could not save memory. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.7}>
          <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Memory</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!title.trim() || isSaving}
          style={[styles.saveBtn, (!title.trim() || isSaving) && styles.saveBtnDisabled]}
          activeOpacity={0.7}
        >
          <Text style={styles.saveBtnText}>{isSaving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Input label="Title" placeholder="What happened?" value={title} onChangeText={setTitle} />

          {/* Photo Section */}
          <Text style={styles.label}>Photo</Text>
          {imageUri ? (
            <TouchableOpacity onPress={showImageOptions} activeOpacity={0.8} style={styles.imagePreviewWrap}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <View style={styles.imageOverlay}>
                <View style={styles.imageOverlayBtn}>
                  <Ionicons name="pencil" size={14} color="#FFFFFF" />
                  <Text style={styles.imageOverlayText}>Change</Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.photoPickerRow}>
              <TouchableOpacity style={styles.photoPickerBtn} onPress={pickImage} activeOpacity={0.7}>
                <View style={[styles.photoPickerIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="images-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.photoPickerLabel}>Library</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoPickerBtn} onPress={takePhoto} activeOpacity={0.7}>
                <View style={[styles.photoPickerIcon, { backgroundColor: colors.pinkLight }]}>
                  <Ionicons name="camera-outline" size={22} color="#EC4899" />
                </View>
                <Text style={styles.photoPickerLabel}>Camera</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Date picker */}
          <Text style={styles.label}>When did this happen?</Text>
          <TouchableOpacity
            style={styles.datePickerBtn}
            onPress={() => setShowDatePicker(!showDatePicker)}
            activeOpacity={0.7}
          >
            <View style={styles.datePickerLeft}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={styles.datePickerValue}>{format(memoryDate, 'EEE, MMM d, yyyy')}</Text>
            </View>
            <Ionicons name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={memoryDate}
              mode="date"
              maximumDate={new Date()}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={onDateChange}
            />
          )}

          {/* Emoji Selector */}
          <Text style={styles.label}>Emoji</Text>
          <View style={{ marginBottom: spacing['2xl'] }}>
            <EmojiPicker options={emojiOptions} selected={selectedEmoji} onSelect={setSelectedEmoji} />
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
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerBtn: {
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
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: colors.border,
  },
  saveBtnText: {
    ...typography.callout,
    color: colors.textInverse,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['3xl'],
  },

  label: {
    ...typography.subhead,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
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
    marginBottom: spacing['2xl'],
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

  // Photo picker
  photoPickerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  photoPickerBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  photoPickerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerLabel: {
    ...typography.subhead,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Image preview
  imagePreviewWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing['2xl'],
    ...shadows.sm,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: radius.lg,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'flex-end',
  },
  imageOverlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  imageOverlayText: {
    ...typography.caption1,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
