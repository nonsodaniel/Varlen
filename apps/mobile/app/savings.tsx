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
import { format, parseISO, differenceInDays } from 'date-fns';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
} from '../src/constants/theme';
import { useSavingsStore } from '../src/stores/savingsStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAlert } from '../src/components/AlertProvider';

const GOAL_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444', '#06B6D4'];

export default function SavingsScreen() {
  const router = useRouter();
  const { goals, fetchGoals, addGoal, addContribution, deleteGoal } = useSavingsStore();
  const { showAlert } = useAlert();
  const cs = useSettingsStore((s) => s.currencySymbol) || '$';

  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [selectedColor, setSelectedColor] = useState(GOAL_COLORS[0]);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');

  useEffect(() => { fetchGoals(); }, []);

  const totalSaved = useMemo(() => goals.reduce((s, g) => s + g.currentAmount, 0), [goals]);
  const totalTarget = useMemo(() => goals.reduce((s, g) => s + g.targetAmount, 0), [goals]);

  const handleAddGoal = async () => {
    if (!title.trim() || !targetAmount.trim()) return;
    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0) {
      showAlert('Invalid amount', 'Please enter a valid target amount.');
      return;
    }
    Keyboard.dismiss();
    await addGoal({
      title: title.trim(),
      targetAmount: target,
      currentAmount: 0,
      color: selectedColor,
      shared: true,
      deadline: deadline ? format(deadline, 'yyyy-MM-dd') : undefined,
    });
    setShowAddForm(false);
    setTitle('');
    setTargetAmount('');
    setDeadline(null);
    setSelectedColor(GOAL_COLORS[0]);
  };

  const handleContribute = async () => {
    if (!contributeGoalId || !contributeAmount.trim()) return;
    const amount = parseFloat(contributeAmount);
    if (isNaN(amount) || amount <= 0) return;
    Keyboard.dismiss();
    await addContribution(contributeGoalId, amount);
    setContributeGoalId(null);
    setContributeAmount('');
  };

  const handleDelete = (id: string, goalTitle: string) => {
    showAlert('Delete Goal', `Remove "${goalTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGoal(id) },
    ]);
  };

  const onDateChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setDeadline(date);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Savings Goals</Text>
        <TouchableOpacity style={styles.addHeaderBtn} onPress={() => setShowAddForm(true)} activeOpacity={0.7}>
          <Ionicons name="add" size={22} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overview */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>Total Saved</Text>
          <Text style={styles.overviewAmount}>{cs}{totalSaved.toLocaleString()}</Text>
          {totalTarget > 0 && (
            <>
              <View style={styles.overviewProgressBg}>
                <View
                  style={[
                    styles.overviewProgressFill,
                    { width: `${Math.min(Math.round((totalSaved / totalTarget) * 100), 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.overviewTarget}>
                of {cs}{totalTarget.toLocaleString()} goal ({Math.round((totalSaved / totalTarget) * 100)}%)
              </Text>
            </>
          )}
        </View>

        {/* Goals list */}
        {goals.length === 0 && !showAddForm && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="trending-up-outline" size={32} color={colors.success} />
            </View>
            <Text style={styles.emptyTitle}>Start saving</Text>
            <Text style={styles.emptyDesc}>
              Set savings goals for vacations, big purchases, emergencies, or anything you're working toward.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAddForm(true)} activeOpacity={0.7}>
              <Ionicons name="add" size={16} color={colors.textInverse} />
              <Text style={styles.emptyBtnText}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        )}

        {goals.map((goal) => {
          const progress = goal.targetAmount > 0 ? Math.min(goal.currentAmount / goal.targetAmount, 1) : 0;
          const remaining = goal.targetAmount - goal.currentAmount;
          const daysLeft = goal.deadline ? differenceInDays(parseISO(goal.deadline), new Date()) : null;

          return (
            <TouchableOpacity
              key={goal.id}
              style={styles.goalCard}
              activeOpacity={0.8}
              onLongPress={() => handleDelete(goal.id, goal.title)}
              onPress={() => setContributeGoalId(contributeGoalId === goal.id ? null : goal.id)}
            >
              <View style={styles.goalTop}>
                <View style={[styles.goalColorDot, { backgroundColor: goal.color }]} />
                <View style={styles.goalInfo}>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                  <Text style={styles.goalSubtitle}>
                    {cs}{goal.currentAmount.toLocaleString()} / {cs}{goal.targetAmount.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.goalPercentBadge}>
                  <Text style={[styles.goalPercent, { color: goal.color }]}>
                    {Math.round(progress * 100)}%
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.goalProgressBg}>
                <View style={[styles.goalProgressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: goal.color }]} />
              </View>

              <View style={styles.goalBottom}>
                {remaining > 0 && (
                  <Text style={styles.goalRemaining}>{cs}{remaining.toLocaleString()} to go</Text>
                )}
                {remaining <= 0 && (
                  <Text style={[styles.goalRemaining, { color: colors.success }]}>Goal reached!</Text>
                )}
                {daysLeft != null && daysLeft > 0 && (
                  <Text style={styles.goalDeadline}>{daysLeft} days left</Text>
                )}
              </View>

              {/* Contribute inline */}
              {contributeGoalId === goal.id && (
                <View style={styles.contributeRow}>
                  <View style={styles.contributeInputWrap}>
                    <Text style={styles.contributeCurrency}>{cs}</Text>
                    <TextInput
                      style={styles.contributeInput}
                      value={contributeAmount}
                      onChangeText={setContributeAmount}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.contributeBtn, { backgroundColor: goal.color }]}
                    onPress={handleContribute}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.contributeBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Add Goal Form */}
        {showAddForm && (
          <View style={styles.addFormCard}>
            <Text style={styles.addFormTitle}>New Savings Goal</Text>

            <Text style={styles.formLabel}>Goal name</Text>
            <TextInput
              style={styles.formInput}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Vacation fund"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={styles.formLabel}>Target amount</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountCurrency}>{cs}</Text>
              <TextInput
                style={styles.amountInput}
                value={targetAmount}
                onChangeText={setTargetAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <Text style={styles.formLabel}>Deadline (optional)</Text>
            <TouchableOpacity
              style={styles.deadlineBtn}
              onPress={() => setShowDatePicker(!showDatePicker)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.deadlineText}>
                {deadline ? format(deadline, 'MMM d, yyyy') : 'No deadline'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={deadline ?? new Date()}
                mode="date"
                minimumDate={new Date()}
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={onDateChange}
                style={{ marginBottom: spacing.md }}
              />
            )}

            <Text style={styles.formLabel}>Color</Text>
            <View style={styles.colorRow}>
              {GOAL_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotActive]}
                  onPress={() => setSelectedColor(c)}
                  activeOpacity={0.7}
                >
                  {selectedColor === c && <Ionicons name="checkmark" size={14} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowAddForm(false); setTitle(''); setTargetAmount(''); setDeadline(null); }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, (!title.trim() || !targetAmount.trim()) && styles.createBtnDisabled]}
                onPress={handleAddGoal}
                disabled={!title.trim() || !targetAmount.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.createBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    backgroundColor: colors.surface, ...shadows.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...typography.headline, color: colors.text },
  addHeaderBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },

  // Overview
  overviewCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.xl, alignItems: 'center', marginBottom: spacing.xl, ...shadows.md,
  },
  overviewLabel: { ...typography.subhead, color: colors.textSecondary, marginBottom: spacing.xs },
  overviewAmount: { ...typography.largeTitle, color: colors.text, marginBottom: spacing.md },
  overviewProgressBg: {
    width: '100%', height: 8, borderRadius: 4,
    backgroundColor: colors.borderLight, overflow: 'hidden',
  },
  overviewProgressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.success },
  overviewTarget: { ...typography.caption1, color: colors.textTertiary, marginTop: spacing.xs },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: spacing['2xl'] },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#ECFDF5',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  emptyTitle: { ...typography.headline, color: colors.text, marginBottom: spacing.xs },
  emptyDesc: { ...typography.body, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.success, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.full,
  },
  emptyBtnText: { ...typography.subhead, color: colors.textInverse, fontWeight: '600' },

  // Goal cards
  goalCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.sm, ...shadows.sm,
  },
  goalTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  goalColorDot: { width: 12, height: 12, borderRadius: 6, marginRight: spacing.md },
  goalInfo: { flex: 1 },
  goalTitle: { ...typography.headline, color: colors.text },
  goalSubtitle: { ...typography.caption1, color: colors.textSecondary, marginTop: 2 },
  goalPercentBadge: {
    backgroundColor: colors.background, paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs, borderRadius: radius.full,
  },
  goalPercent: { ...typography.subhead, fontWeight: '700' },
  goalProgressBg: { height: 6, borderRadius: 3, backgroundColor: colors.borderLight, overflow: 'hidden' },
  goalProgressFill: { height: '100%', borderRadius: 3 },
  goalBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  goalRemaining: { ...typography.caption1, color: colors.textSecondary },
  goalDeadline: { ...typography.caption1, color: colors.textTertiary },

  // Contribute inline
  contributeRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  contributeInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: radius.md,
    paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.borderLight,
  },
  contributeCurrency: { ...typography.body, color: colors.textSecondary, marginRight: spacing.xs },
  contributeInput: { flex: 1, ...typography.body, color: colors.text, paddingVertical: spacing.sm },
  contributeBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md,
  },
  contributeBtnText: { ...typography.subhead, color: '#fff', fontWeight: '600' },

  // Add form
  addFormCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.xl, marginTop: spacing.md, ...shadows.md,
  },
  addFormTitle: { ...typography.title3, color: colors.text, marginBottom: spacing.lg },
  formLabel: { ...typography.subhead, color: colors.textSecondary, marginBottom: spacing.xs },
  formInput: {
    backgroundColor: colors.background, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    ...typography.body, color: colors.text, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  amountRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  amountCurrency: { ...typography.title3, color: colors.textSecondary, marginRight: spacing.xs },
  amountInput: { flex: 1, ...typography.title3, color: colors.text, paddingVertical: spacing.md },
  deadlineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.background, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  deadlineText: { ...typography.body, color: colors.text },
  colorRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  colorDot: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  colorDotActive: { borderWidth: 3, borderColor: colors.surface, ...shadows.md },
  formActions: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md,
    borderRadius: radius.lg, backgroundColor: colors.background,
  },
  cancelBtnText: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
  createBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md,
    borderRadius: radius.lg, backgroundColor: colors.success,
  },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: { ...typography.body, color: colors.textInverse, fontWeight: '600' },
});
