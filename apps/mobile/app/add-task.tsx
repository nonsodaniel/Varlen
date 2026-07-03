import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, typography, spacing, radius, categoryColors } from '../src/constants/theme';
import { Input } from '../src/components/ui/Input';
import { useTaskStore } from '../src/stores/taskStore';
import { currentUser, partner } from '../src/data/mock';

type Priority = 'low' | 'medium' | 'high';
type Category = 'personal' | 'household' | 'work' | 'errand';

const priorities: { value: Priority; label: string; color: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'low', label: 'Low', color: colors.success, icon: 'arrow-down-outline' },
  { value: 'medium', label: 'Medium', color: colors.warning, icon: 'remove-outline' },
  { value: 'high', label: 'High', color: colors.error, icon: 'arrow-up-outline' },
];

const categoryList: { value: Category; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'personal', label: 'Personal', icon: 'person-outline' },
  { value: 'household', label: 'Home', icon: 'home-outline' },
  { value: 'work', label: 'Work', icon: 'briefcase-outline' },
  { value: 'errand', label: 'Errand', icon: 'car-outline' },
];

export default function AddTaskScreen() {
  const router = useRouter();
  const { addTask } = useTaskStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<Category>('personal');
  const [isShared, setIsShared] = useState(true);
  const [assignToPartner, setAssignToPartner] = useState(false);

  const handleSave = () => {
    if (!title.trim()) return;
    Keyboard.dismiss();
    addTask({
      id: `task-${Date.now()}`, title: title.trim(),
      description: description.trim() || undefined, completed: false,
      dueDate: format(new Date(), 'yyyy-MM-dd'), priority, category,
      assignedTo: assignToPartner ? partner.id : currentUser.id,
      createdBy: currentUser.id, shared: isShared,
    });
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Task</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!title.trim()}
          style={[styles.saveBtn, !title.trim() && styles.saveBtnDisabled]}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Input label="What needs to be done?" placeholder="Enter task title" value={title} onChangeText={setTitle} autoFocus />
          <Input label="Notes" placeholder="Add details..." value={description} onChangeText={setDescription} multiline numberOfLines={3} style={styles.textArea} />

          {/* Priority */}
          <Text style={styles.label}>Priority</Text>
          <View style={styles.chips}>
            {priorities.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[styles.chip, priority === p.value && { backgroundColor: p.color, borderColor: p.color }]}
                onPress={() => setPriority(p.value)}
              >
                <Ionicons name={p.icon} size={14} color={priority === p.value ? '#fff' : p.color} />
                <Text style={[styles.chipText, priority === p.value && styles.chipTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <View style={styles.chips}>
            {categoryList.map((c) => {
              const cc = categoryColors[c.value] || categoryColors.other;
              const isActive = category === c.value;
              return (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.chip, isActive && { backgroundColor: cc.icon, borderColor: cc.icon }]}
                  onPress={() => setCategory(c.value)}
                >
                  <Ionicons name={c.icon} size={14} color={isActive ? '#fff' : cc.icon} />
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Toggles */}
          <View style={styles.toggleCard}>
            <View style={styles.toggle}>
              <View style={styles.toggleLeft}>
                <View style={[styles.toggleIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="people-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.toggleLabel}>Shared task</Text>
              </View>
              <Switch value={isShared} onValueChange={setIsShared} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
            </View>
            <View style={styles.toggleDivider} />
            <View style={styles.toggle}>
              <View style={styles.toggleLeft}>
                <View style={[styles.toggleIcon, { backgroundColor: colors.warningLight }]}>
                  <Ionicons name="person-outline" size={18} color={colors.warning} />
                </View>
                <Text style={styles.toggleLabel}>Assign to {partner.name}</Text>
              </View>
              <Switch value={assignToPartner} onValueChange={setAssignToPartner} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...typography.headline, color: colors.text },
  saveBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { ...typography.subhead, color: '#fff', fontWeight: '600' },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  textArea: { height: 80, textAlignVertical: 'top', paddingTop: spacing.md },
  label: { ...typography.subhead, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
  },
  chipText: { ...typography.subhead, color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
  toggleCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight, marginTop: spacing.sm,
  },
  toggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg,
  },
  toggleDivider: { height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggleIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleLabel: { ...typography.body, color: colors.text },
});
