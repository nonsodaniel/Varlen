import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addHours } from 'date-fns';
import { colors, typography, spacing, radius, shadows, personColors } from '../src/constants/theme';
import { Input } from '../src/components/ui/Input';
import { useCalendarStore } from '../src/stores/calendarStore';
import { currentUser } from '../src/data/mock';

const colorOptions: { label: string; value: string }[] = [
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Green', value: '#10B981' },
  { label: 'Gold', value: '#F59E0B' },
  { label: 'Pink', value: '#EC4899' },
  { label: 'Violet', value: '#8B5CF6' },
  { label: 'Coral', value: '#EF4444' },
];

export default function AddEventScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const { addEvent, updateEvent, events } = useCalendarStore();
  const existingEvent = eventId ? events.find((e) => e.id === eventId) : undefined;
  const isEditing = !!existingEvent;

  const [title, setTitle] = useState(existingEvent?.title ?? '');
  const [description, setDescription] = useState(existingEvent?.description ?? '');
  const [location, setLocation] = useState(existingEvent?.location ?? '');
  const [isAllDay, setIsAllDay] = useState(existingEvent?.allDay ?? false);
  const [isShared, setIsShared] = useState(existingEvent?.shared ?? true);
  const [selectedColor, setSelectedColor] = useState<string>(existingEvent?.color ?? personColors[0]);

  const handleSave = () => {
    if (!title.trim()) return;
    Keyboard.dismiss();
    if (isEditing && existingEvent) {
      updateEvent(existingEvent.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        allDay: isAllDay,
        color: selectedColor,
        location: location.trim() || undefined,
        shared: isShared,
      });
    } else {
      const now = new Date();
      addEvent({
        id: `event-${Date.now()}`, title: title.trim(),
        description: description.trim() || undefined,
        startDate: addHours(now, 1).toISOString(), endDate: addHours(now, 2).toISOString(),
        allDay: isAllDay, color: selectedColor,
        location: location.trim() || undefined,
        createdBy: currentUser.id, shared: isShared,
      });
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Event' : 'New Event'}</Text>
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
          {/* Color banner preview */}
          <View style={styles.colorBanner}>
            <View style={[styles.colorBannerBar, { backgroundColor: selectedColor }]} />
            <Text style={[styles.colorBannerText, { color: selectedColor }]}>
              {title.trim() || 'Event preview'}
            </Text>
          </View>

          <Input label="Title" placeholder="What's happening?" value={title} onChangeText={setTitle} autoFocus />
          <Input label="Location" placeholder="Add a location" value={location} onChangeText={setLocation} />
          <Input label="Notes" placeholder="Add details..." value={description} onChangeText={setDescription} multiline numberOfLines={3} style={styles.textArea} />

          {/* Color Picker */}
          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {colorOptions.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={[
                  styles.colorDot,
                  { backgroundColor: opt.value },
                  selectedColor === opt.value && styles.colorDotActive,
                ]}
                onPress={() => setSelectedColor(opt.value)}
                activeOpacity={0.7}
              >
                {selectedColor === opt.value && <Ionicons name="checkmark" size={14} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Toggles */}
          <View style={styles.toggleCard}>
            <View style={styles.toggle}>
              <View style={styles.toggleLeft}>
                <View style={[styles.toggleIcon, { backgroundColor: colors.warningLight }]}>
                  <Ionicons name="time-outline" size={18} color={colors.warning} />
                </View>
                <Text style={styles.toggleLabel}>All day</Text>
              </View>
              <Switch value={isAllDay} onValueChange={setIsAllDay} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
            </View>
            <View style={styles.toggleDivider} />
            <View style={styles.toggle}>
              <View style={styles.toggleLeft}>
                <View style={[styles.toggleIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="people-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.toggleLabel}>Shared event</Text>
              </View>
              <Switch value={isShared} onValueChange={setIsShared} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
            </View>
          </View>
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

  // Color banner
  colorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  colorBannerBar: {
    width: 4,
    height: 28,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  colorBannerText: {
    ...typography.headline,
  },

  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },

  // Color picker
  label: {
    ...typography.subhead,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  colorRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: colors.surface,
    ...shadows.md,
  },

  // Toggle card
  toggleCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  toggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  toggleDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.lg,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLabel: {
    ...typography.body,
    color: colors.text,
  },
});
