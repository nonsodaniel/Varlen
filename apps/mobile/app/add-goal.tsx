import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '../src/constants/theme';
import { Input } from '../src/components/ui/Input';
import { useGoalStore } from '../src/stores/goalStore';
import { currentUser } from '../src/data/mock';

const colorOptions = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444', '#06B6D4', '#F97316'];

export default function AddGoalScreen() {
  const router = useRouter();
  const { addGoal } = useGoalStore();
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);

  const handleSave = () => {
    if (!title.trim() || !target.trim() || !unit.trim() || !deadline.trim()) return;
    Keyboard.dismiss();
    addGoal({
      id: 'goal-' + Date.now(),
      title: title.trim(),
      progress: 0,
      target: parseInt(target, 10),
      unit: unit.trim(),
      deadline: deadline.trim(),
      color: selectedColor,
      createdBy: currentUser.id,
    });
    router.back();
  };

  const canSave = title.trim() && target.trim() && unit.trim() && deadline.trim();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Goal</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            activeOpacity={0.7}
          >
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Goal title</Text>
          <Input
            placeholder="e.g. Read 12 books"
            value={title}
            onChangeText={setTitle}
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Target</Text>
              <Input
                placeholder="e.g. 12"
                value={target}
                onChangeText={setTarget}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Unit</Text>
              <Input
                placeholder="e.g. books"
                value={unit}
                onChangeText={setUnit}
              />
            </View>
          </View>

          <Text style={styles.label}>Deadline (YYYY-MM-DD)</Text>
          <Input
            placeholder="e.g. 2026-12-31"
            value={deadline}
            onChangeText={setDeadline}
          />

          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {colorOptions.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  selectedColor === c && styles.colorDotActive,
                ]}
                onPress={() => setSelectedColor(c)}
                activeOpacity={0.7}
              >
                {selectedColor === c && (
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: spacing['3xl'] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
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
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...typography.headline, color: colors.text },
  saveBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.full,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { ...typography.subhead, color: colors.textInverse, fontWeight: '600' },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  label: {
    ...typography.headline, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.lg,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  halfField: { flex: 1 },
  colorRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md,
  },
  colorDot: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  colorDotActive: {
    borderWidth: 3, borderColor: '#FFF',
    ...shadows.md,
  },
});
