import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, typography, spacing, radius, categoryColors } from '../src/constants/theme';
import { Input } from '../src/components/ui/Input';
import { useExpenseStore } from '../src/stores/expenseStore';
import { currentUser, partner } from '../src/data/mock';
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
  const { addExpense } = useExpenseStore();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [paidByMe, setPaidByMe] = useState(true);

  const handleSave = () => {
    if (!title.trim() || !amount) return;
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;
    addExpense({
      id: `expense-${Date.now()}`, title: title.trim(), amount: parsed, currency: 'USD',
      paidBy: paidByMe ? currentUser.id : partner.id,
      splitBetween: [currentUser.id, partner.id],
      category, date: format(new Date(), 'yyyy-MM-dd'), settled: false,
    });
    router.back();
  };

  const isValid = title.trim() && amount && parseFloat(amount) > 0;
  const selectedCat = categoryColors[category] || categoryColors.other;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Expense</Text>
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
            <Text style={styles.currency}>$</Text>
            <Input placeholder="0.00" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={styles.amountInput} containerStyle={styles.amountContainer} />
          </View>

          <Input label="Description" placeholder="What was this for?" value={title} onChangeText={setTitle} />

          {/* Paid by */}
          <Text style={styles.label}>Paid by</Text>
          <View style={styles.payerRow}>
            <TouchableOpacity style={[styles.payer, paidByMe && styles.payerActive]} onPress={() => setPaidByMe(true)}>
              <Ionicons name="person" size={16} color={paidByMe ? '#fff' : colors.textSecondary} />
              <Text style={[styles.payerText, paidByMe && styles.payerTextActive]}>You</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.payer, !paidByMe && styles.payerActive]} onPress={() => setPaidByMe(false)}>
              <Ionicons name="person" size={16} color={!paidByMe ? '#fff' : colors.textSecondary} />
              <Text style={[styles.payerText, !paidByMe && styles.payerTextActive]}>{partner.name}</Text>
            </TouchableOpacity>
          </View>

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

          {/* Split info */}
          <View style={styles.splitBox}>
            <View style={[styles.splitIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="git-compare-outline" size={16} color={colors.primary} />
            </View>
            <Text style={styles.splitText}>
              Split equally — each person pays{' '}
              <Text style={{ fontWeight: '700', color: colors.text }}>
                ${amount ? (parseFloat(amount) / 2).toFixed(2) : '0.00'}
              </Text>
            </Text>
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
  amountSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  currency: { ...typography.largeTitle, color: colors.textTertiary, marginRight: spacing.xs },
  amountInput: { ...typography.largeTitle, textAlign: 'center', borderWidth: 0, backgroundColor: 'transparent', fontSize: 40, height: 56 },
  amountContainer: { flex: 1, marginBottom: 0 },
  label: { ...typography.subhead, color: colors.textSecondary, marginBottom: spacing.sm },
  payerRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  payer: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border,
  },
  payerActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  payerText: { ...typography.headline, color: colors.textSecondary },
  payerTextActive: { color: '#fff' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
  },
  catText: { ...typography.subhead, color: colors.textSecondary },
  catTextActive: { color: '#fff' },
  splitBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primaryLight, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md,
  },
  splitIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  splitText: { ...typography.callout, color: colors.textSecondary, flex: 1 },
});
