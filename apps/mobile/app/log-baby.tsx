import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  typography,
  spacing,
  radius,
} from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useHouseholdStore } from '../src/stores/householdStore';
import { haptics } from '../src/hooks/useHaptics';
import type { BabyLog } from '../src/types';

type LogType = 'feed' | 'sleep' | 'diaper' | 'milestone';

const STORAGE_KEY = '@sivena_baby_logs';

const logTypes: { type: LogType; label: string; emoji: string }[] = [
  { type: 'feed', label: 'Feed', emoji: '\uD83C\uDF7C' },
  { type: 'sleep', label: 'Sleep', emoji: '\uD83D\uDCA4' },
  { type: 'diaper', label: 'Diaper', emoji: '\uD83E\uDDF7' },
  { type: 'milestone', label: 'Milestone', emoji: '\u2B50' },
];

export default function LogBabyScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const children = useHouseholdStore((s) => s.household?.children ?? []);
  const [selectedChildIdx, setSelectedChildIdx] = useState(0);
  const child = children[selectedChildIdx] ?? { id: '', name: 'Baby' };

  const [selectedType, setSelectedType] = useState<LogType>('feed');
  const [duration, setDuration] = useState('');
  const [note, setNote] = useState('');
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [localLogs, setLocalLogs] = useState<BabyLog[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load persisted logs on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => { if (raw) setLocalLogs(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  const todayLogs = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return [...localLogs]
      .filter((log) => log.type === selectedType && log.childId === child.id && log.timestamp.startsWith(today))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [selectedType, localLogs, child.id]);

  const resetForm = () => {
    setDuration('');
    setNote('');
    setMilestoneTitle('');
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (selectedType === 'milestone' && !milestoneTitle.trim()) return;
    Keyboard.dismiss();
    setIsSaving(true);
    try {
      const newLog: BabyLog = {
        id: `bl-${Date.now()}`,
        childId: child.id,
        type: selectedType,
        timestamp: new Date().toISOString(),
        duration:
          selectedType === 'feed' || selectedType === 'sleep'
            ? parseInt(duration, 10) || undefined
            : undefined,
        note:
          selectedType === 'milestone'
            ? `${milestoneTitle.trim()}${note ? ' — ' + note : ''}`
            : note.trim() || undefined,
      };

      const updated = [newLog, ...localLogs];
      setLocalLogs(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      haptics.success();
      resetForm();

      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)' as any);
    } catch {
      haptics.warning();
    } finally {
      setIsSaving(false);
    }
  };

  const saveBtnLabel = selectedType === 'milestone'
    ? 'Save Milestone'
    : `Log ${logTypes.find((lt) => lt.type === selectedType)?.label ?? ''}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)' as any); }}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {children.length > 1 ? 'Log' : `Log for ${child.name}`}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Multi-child selector */}
        {children.length > 1 && (
          <View style={styles.childRow}>
            {children.map((c, idx) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.childBtn, idx === selectedChildIdx && styles.childBtnSelected]}
                onPress={() => setSelectedChildIdx(idx)}
                activeOpacity={0.7}
              >
                <Text style={[styles.childBtnText, idx === selectedChildIdx && styles.childBtnTextSelected]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Type selector */}
        <View style={styles.typeRow}>
          {logTypes.map((lt) => (
            <TouchableOpacity
              key={lt.type}
              style={[
                styles.typeBtn,
                selectedType === lt.type && styles.typeBtnSelected,
              ]}
              activeOpacity={0.7}
              onPress={() => {
                setSelectedType(lt.type);
                resetForm();
              }}
            >
              <Text style={styles.typeEmoji}>{lt.emoji}</Text>
              <Text
                style={[
                  styles.typeLabel,
                  selectedType === lt.type && styles.typeLabelSelected,
                ]}
              >
                {lt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form fields */}
        <View style={styles.formCard}>
          {/* Time display for feed, sleep, diaper */}
          {selectedType !== 'milestone' && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Time</Text>
              <Text style={styles.fieldValue}>{format(new Date(), 'h:mm a')}</Text>
            </View>
          )}

          {/* Duration for feed and sleep */}
          {(selectedType === 'feed' || selectedType === 'sleep') && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Duration (min)</Text>
              <TextInput
                style={styles.fieldInput}
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
                placeholder="e.g. 20"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          )}

          {/* Milestone title */}
          {selectedType === 'milestone' && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.fieldInput}
                value={milestoneTitle}
                onChangeText={setMilestoneTitle}
                placeholder="e.g. First steps!"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          )}

          {/* Note */}
          <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.fieldLabel}>Note</Text>
            <TextInput
              style={styles.fieldInput}
              value={note}
              onChangeText={setNote}
              placeholder={
                selectedType === 'diaper'
                  ? 'wet, dirty, or both'
                  : 'Optional note...'
              }
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
          activeOpacity={0.7}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.textInverse} />
          <Text style={styles.saveBtnText}>{saveBtnLabel}</Text>
        </TouchableOpacity>

        {/* Today's logs */}
        {todayLogs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Today's {logTypes.find((lt) => lt.type === selectedType)?.label} logs
            </Text>
            {todayLogs.map((log) => (
              <View key={log.id} style={styles.logRow}>
                <Text style={styles.logTime}>
                  {format(parseISO(log.timestamp), 'h:mm a')}
                </Text>
                <View style={styles.logInfo}>
                  {log.duration != null && (
                    <Text style={styles.logDuration}>{log.duration} min</Text>
                  )}
                  {log.note ? (
                    <Text style={styles.logNote} numberOfLines={2}>
                      {log.note}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
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
    ...shadows.sm,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cancelBtnText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },

  // Child selector
  childRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  childBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  childBtnSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  childBtnText: {
    ...typography.subhead,
    color: colors.textSecondary,
  },
  childBtnTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },

  // Type selector
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  typeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  typeBtnSelected: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  typeEmoji: {
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  typeLabel: {
    ...typography.caption1,
    color: colors.textSecondary,
  },
  typeLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },

  // Form
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  fieldLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  fieldValue: {
    ...typography.body,
    color: colors.textSecondary,
  },
  fieldInput: {
    ...typography.body,
    color: colors.text,
    textAlign: 'right',
    flex: 1,
    paddingVertical: 0,
  },

  // Save button
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  saveBtnText: {
    ...typography.headline,
    color: colors.textInverse,
  },

  // Recent logs
  sectionTitle: {
    ...typography.title3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  logRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    ...shadows.sm,
  },
  logTime: {
    ...typography.subhead,
    color: colors.primary,
    width: 80,
  },
  logInfo: {
    flex: 1,
  },
  logDuration: {
    ...typography.callout,
    color: colors.text,
  },
  logNote: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
