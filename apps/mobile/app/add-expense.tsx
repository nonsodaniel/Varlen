import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, typography, spacing, radius, categoryColors } from '../src/constants/theme';
import { Input } from '../src/components/ui/Input';
import { useExpenseStore } from '../src/stores/expenseStore';
import { useAuthStore } from '../src/stores/authStore';
import { useHouseholdStore } from '../src/stores/householdStore';
import { useModeStore } from '../src/stores/modeStore';
import { useAlert } from '../src/components/AlertProvider';
import { useSettingsStore } from '../src/stores/settingsStore';
import type { ExpenseCategory } from '../src/types';

const categories: { value: ExpenseCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'groceries', label: 'Groceries', icon: 'cart' },
  { value: 'dining', label: 'Dining', icon: 'restaurant' },
  { value: 'utilities', label: 'Utilities', icon: 'flash' },
  { value: 'rent', label: 'Rent', icon: 'home' },
  { value: 'transport', label: 'Transport', icon: 'car' },
  { value: 'entertainment', label: 'Fun', icon: 'film' },
  { value: 'health', label: 'Health', icon: 'heart' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

export default function AddExpenseScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { addExpense } = useExpenseStore();
  const user = useAuthStore((s) => s.user);
  const { members } = useHouseholdStore();
  const { mode } = useModeStore();
  const { currency: currCode, currencySymbol } = useSettingsStore();
  const cs = currencySymbol || '$';
  const currentUser = { id: user?.id ?? '', name: user?.name ?? 'You', email: user?.email ?? '' };

  const otherMembers = useMemo(
    () => members.filter((m) => m.id !== user?.id),
    [members, user],
  );
  const partner = otherMembers[0] ?? { id: '', name: 'Partner', email: '' };

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [paidById, setPaidById] = useState(currentUser.id);
  const [splitBetween, setSplitBetween] = useState<string[]>(
    mode === 'single' ? [currentUser.id] : [currentUser.id, partner.id],
  );
  const [otherDescription, setOtherDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isMultiMember = mode === 'family' || mode === 'parenting';
  const isSingle = mode === 'single';

  const allMembers = useMemo(() => {
    return [{ id: currentUser.id, name: currentUser.name }, ...otherMembers.map((m) => ({ id: m.id, name: m.name }))];
  }, [currentUser, otherMembers]);

  const toggleSplitMember = (memberId: string) => {
    setSplitBetween((prev) => {
      if (prev.includes(memberId)) {
        if (prev.length <= 1) return prev; // must have at least 1
        return prev.filter((id) => id !== memberId);
      }
      return [...prev, memberId];
    });
  };

  const onDateChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setExpenseDate(date);
  };

  const perPersonAmount = useMemo(() => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0 || splitBetween.length === 0) return 0;
    return Math.round((parsed / splitBetween.length) * 100) / 100;
  }, [amount, splitBetween]);

  const handleSave = async () => {
    if (!title.trim() || !amount || isSaving) return;
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;
    Keyboard.dismiss();
    setIsSaving(true);
    try {
      const expenseTitle = category === 'other' && otherDescription.trim()
        ? `${title.trim()} (${otherDescription.trim()})`
        : title.trim();
      await addExpense({
        title: expenseTitle,
        amount: Math.round(parsed * 100) / 100,
        currency: currCode,
        paidBy: isSingle ? currentUser.id : paidById,
        splitBetween: isSingle ? [currentUser.id] : splitBetween,
        category,
        date: format(expenseDate, 'yyyy-MM-dd'),
        settled: isSingle,
      });
      router.back();
    } catch {
      showAlert('Error', 'Could not save expense. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const isValid = title.trim() && amount && parseFloat(amount) > 0 && !isSaving;
  const selectedCat = categoryColors[category] || categoryColors.other;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isSingle ? 'Log Expense' : 'New Expense'}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!isValid}
          style={[styles.saveBtn, !isValid && styles.saveBtnDisabled]}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Amount */}
          <View style={styles.amountSection}>
            <Text style={styles.currency}>{cs}</Text>
            <Input placeholder="0.00" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={styles.amountInput} containerStyle={styles.amountContainer} />
          </View>

          <Input label="Description" placeholder="What was this for?" value={title} onChangeText={setTitle} />

          {/* Paid by — Couple mode: binary toggle */}
          {mode === 'couple' && (
            <>
              <Text style={styles.label}>Paid by</Text>
              <View style={styles.payerRow}>
                <TouchableOpacity
                  style={[styles.payer, paidById === currentUser.id && styles.payerActive]}
                  onPress={() => setPaidById(currentUser.id)}
                >
                  <Ionicons name="person" size={16} color={paidById === currentUser.id ? '#fff' : colors.textSecondary} />
                  <Text style={[styles.payerText, paidById === currentUser.id && styles.payerTextActive]}>You</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.payer, paidById === partner.id && styles.payerActive]}
                  onPress={() => setPaidById(partner.id)}
                >
                  <Ionicons name="person" size={16} color={paidById === partner.id ? '#fff' : colors.textSecondary} />
                  <Text style={[styles.payerText, paidById === partner.id && styles.payerTextActive]}>{partner.name}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Paid by — Family/Parenting mode: member selector */}
          {isMultiMember && (
            <>
              <Text style={styles.label}>Paid by</Text>
              <View style={styles.memberList}>
                {allMembers.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    style={[styles.memberChip, paidById === member.id && styles.memberChipActive]}
                    onPress={() => setPaidById(member.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.memberDot, { backgroundColor: paidById === member.id ? '#fff' : colors.textTertiary }]} />
                    <Text style={[styles.memberChipText, paidById === member.id && styles.memberChipTextActive]}>
                      {member.id === currentUser.id ? 'You' : member.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Split between — Family/Parenting mode */}
          {isMultiMember && (
            <>
              <Text style={styles.label}>Split between</Text>
              <View style={styles.splitMemberList}>
                {allMembers.map((member) => {
                  const isSelected = splitBetween.includes(member.id);
                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={[styles.splitMemberRow, isSelected && styles.splitMemberRowActive]}
                      onPress={() => toggleSplitMember(member.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                      <Text style={styles.splitMemberName}>
                        {member.id === currentUser.id ? 'You' : member.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <View style={styles.catGrid}>
            {categories.map((cat) => {
              const cc = categoryColors[cat.value] || categoryColors.other;
              const isActive = category === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[styles.catChip, isActive && { backgroundColor: cc.icon, borderColor: cc.icon }]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Ionicons name={cat.icon} size={14} color={isActive ? '#fff' : cc.icon} />
                  <Text style={[styles.catText, isActive && styles.catTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {category === 'other' && (
            <Input
              label="What type of expense?"
              placeholder="e.g. Gift, Subscription, Pet supplies..."
              value={otherDescription}
              onChangeText={setOtherDescription}
              style={{ marginBottom: spacing.md }}
            />
          )}

          {/* Date */}
          <TouchableOpacity
            style={styles.datePickerBtn}
            onPress={() => setShowDatePicker(!showDatePicker)}
            activeOpacity={0.7}
          >
            <View style={styles.datePickerLeft}>
              <View style={styles.datePickerIcon}>
                <Ionicons name="calendar-outline" size={16} color="#3B82F6" />
              </View>
              <View>
                <Text style={styles.datePickerLabel}>Date</Text>
                <Text style={styles.datePickerValue}>{format(expenseDate, 'EEE, MMM d, yyyy')}</Text>
              </View>
            </View>
            <Ionicons name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={expenseDate}
              mode="date"
              maximumDate={new Date()}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={onDateChange}
              style={{ marginBottom: spacing.md }}
            />
          )}

          {/* Split info — only for shared modes */}
          {!isSingle && (
            <View style={styles.splitBox}>
              <View style={[styles.splitIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="git-compare-outline" size={16} color={colors.primary} />
              </View>
              <Text style={styles.splitText}>
                Split {splitBetween.length > 2 ? `${splitBetween.length} ways` : 'equally'} — each person pays{' '}
                <Text style={{ fontWeight: '700', color: colors.text }}>
                  {cs}{perPersonAmount.toFixed(2)}
                </Text>
              </Text>
            </View>
          )}

          {/* Personal expense note for single mode */}
          {isSingle && (
            <View style={styles.splitBox}>
              <View style={[styles.splitIcon, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="person-outline" size={16} color="#10B981" />
              </View>
              <Text style={styles.splitText}>
                This is a personal expense — only visible to you.
              </Text>
            </View>
          )}

          <View style={{ height: spacing['3xl'] }} />
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
  amountSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  currency: { ...typography.largeTitle, color: colors.textTertiary, marginRight: spacing.xs },
  amountInput: { textAlign: 'center', borderWidth: 0, backgroundColor: 'transparent', fontSize: 36, fontWeight: '700' as const, lineHeight: 44, height: undefined, paddingVertical: 0 },
  amountContainer: { flex: 1, marginBottom: 0 },
  label: { ...typography.subhead, color: colors.textSecondary, marginBottom: spacing.sm },

  // Couple mode payer
  payerRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  payer: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border,
  },
  payerActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  payerText: { ...typography.headline, color: colors.textSecondary },
  payerTextActive: { color: '#fff' },

  // Family mode member selector
  memberList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
  },
  memberChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  memberDot: { width: 8, height: 8, borderRadius: 4 },
  memberChipText: { ...typography.subhead, color: colors.textSecondary },
  memberChipTextActive: { color: '#fff', fontWeight: '600' },

  // Split between multi-select
  splitMemberList: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    marginBottom: spacing.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.borderLight,
  },
  splitMemberRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  splitMemberRowActive: { backgroundColor: colors.primaryLight + '30' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  splitMemberName: { ...typography.body, color: colors.text },

  // Date picker
  datePickerBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  datePickerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  datePickerIcon: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#DBEAFE',
    alignItems: 'center', justifyContent: 'center',
  },
  datePickerLabel: { ...typography.caption1, color: colors.textTertiary },
  datePickerValue: { ...typography.body, color: colors.text, marginTop: 1 },

  // Category grid
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
  },
  catText: { ...typography.subhead, color: colors.textSecondary },
  catTextActive: { color: '#fff' },

  // Split info box
  splitBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primaryLight, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md,
    marginTop: spacing.md,
  },
  splitIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  splitText: { ...typography.callout, color: colors.textSecondary, flex: 1 },
});
