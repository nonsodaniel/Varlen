import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, Image, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useModeStore } from '../src/stores/modeStore';
import { useAlert } from '../src/components/AlertProvider';

const emojiOptions = ['\u2764\uFE0F', '\uD83C\uDF89', '\uD83C\uDF05', '\uD83C\uDF7D\uFE0F', '\u2708\uFE0F', '\uD83C\uDF82', '\uD83C\uDFE0', '\uD83C\uDFB5', '\uD83D\uDCF8', '\uD83C\uDF38', '\u2B50', '\uD83C\uDF81'];

export default function AddMemoryScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { showAlert } = useAlert();
  const user = useAuthStore((s) => s.user);
  const currentUser = { id: user?.id ?? '', name: user?.name ?? 'You', email: user?.email ?? '' };
  const { addMemory } = useMemoryStore();
  const mode = useModeStore((s) => s.mode);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<string>(emojiOptions[0]);
  const [memoryDate, setMemoryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const onDateChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setMemoryDate(date);
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission needed', 'Please allow photo library access to add images to your memories.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1, // Keep original quality — compression happens in the store before upload
      selectionLimit: 6,
    });

    if (!result.canceled && result.assets.length) {
      const newUris = result.assets.map((a) => a.uri);
      setImageUris((prev) => {
        const combined = [...prev, ...newUris];
        // Deduplicate and cap at 6
        return [...new Set(combined)].slice(0, 6);
      });
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
      quality: 1, // Compression happens in store
    });

    if (!result.canceled && result.assets[0]) {
      setImageUris((prev) => [...new Set([...prev, result.assets[0].uri])].slice(0, 6));
    }
  };

  const removeImage = (uri: string) => {
    setImageUris((prev) => prev.filter((u) => u !== uri));
  };

  const showAddPhotoOptions = () => {
    showAlert('Add Photos', 'Choose how to add photos', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickImages },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const handleSave = () => {
    if (!title.trim() || isSaving) return;
    Keyboard.dismiss();
    setIsSaving(true);
    // Optimistic update is applied immediately inside addMemory; navigate back right away
    addMemory(
      {
        title: title.trim(),
        description: notes.trim() || undefined,
        emoji: selectedEmoji,
        date: format(memoryDate, 'yyyy-MM-dd'),
        type: imageUris.length > 0 ? 'photo' : 'milestone',
        createdBy: currentUser.id,
        shared: false,
        mode,
      },
      imageUris.length > 0 ? imageUris : undefined,
    ).catch(() => {
      // Store reverts the optimistic item on failure — no further action needed here
    });
    router.canGoBack() ? router.back() : router.replace('/(tabs)' as any);
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} style={styles.headerBtn} activeOpacity={0.7}>
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
          <Text style={styles.label}>Photos{imageUris.length > 0 ? ` (${imageUris.length}/6)` : ''}</Text>
          {imageUris.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageGrid} contentContainerStyle={styles.imageGridContent}>
              {imageUris.map((uri) => (
                <View key={uri} style={styles.imageThumbnailWrap}>
                  <Image source={{ uri }} style={styles.imageThumbnail} />
                  <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => removeImage(uri)} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                    <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
              {imageUris.length < 6 && (
                <TouchableOpacity style={[styles.addMoreBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={showAddPhotoOptions} activeOpacity={0.7}>
                  <Ionicons name="add" size={28} color={colors.primary} />
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
          {imageUris.length === 0 && (
            <View style={styles.photoPickerRow}>
              <TouchableOpacity style={styles.photoPickerBtn} onPress={pickImages} activeOpacity={0.7}>
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
            <DateTimePicker themeVariant="light"
              value={memoryDate}
              mode="date"
              maximumDate={new Date()}
              display={Platform.OS === 'ios' ? 'compact' : 'default'}
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
    </View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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
    color: '#FFFFFF',
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

  // Image grid (multi-select)
  imageGrid: {
    marginBottom: spacing['2xl'],
  },
  imageGridContent: {
    gap: 8,
    paddingRight: spacing.xs,
  },
  imageThumbnailWrap: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: radius.md,
    overflow: 'visible',
  },
  imageThumbnail: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
  },
  imageRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    zIndex: 1,
  },
  addMoreBtn: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
