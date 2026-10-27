import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSettingsStore } from '../stores/settingsStore';
import { typography, spacing, radius } from '../constants/theme';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
];

interface Props {
  visible: boolean;
  onDone: () => void;
}

export function CurrencySetupModal({ visible, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const setCurrency = useSettingsStore((s) => s.setCurrency);
  const selectedCode = useSettingsStore((s) => s.currency);

  const handleSelect = (code: string, symbol: string) => {
    setCurrency(code, symbol);
    onDone();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onDone}>
      <View style={[styles.root, { paddingBottom: insets.bottom + spacing.lg }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Choose your currency</Text>
            <Text style={styles.subtitle}>Used for expenses and budgeting</Text>
          </View>
        </View>

        <ScrollView
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {CURRENCIES.map((c) => {
            const isSelected = selectedCode === c.code;
            return (
              <TouchableOpacity
                key={c.code}
                style={[styles.row, isSelected && styles.rowSelected]}
                onPress={() => handleSelect(c.code, c.symbol)}
                activeOpacity={0.6}
              >
                <View style={[styles.symbolWrap, isSelected && { backgroundColor: colors.primary }]}>
                  <Text style={[styles.symbol, isSelected && { color: '#fff' }]}>{c.symbol}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={[styles.name, isSelected && { color: colors.primary, fontWeight: '600' }]}>{c.name}</Text>
                  <Text style={styles.code}>{c.code}</Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  title: {
    ...typography.title2,
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.callout,
    color: colors.textSecondary,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 32,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  symbolWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  symbol: {
    ...typography.headline,
    color: colors.text,
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.body,
    color: colors.text,
  },
  code: {
    ...typography.caption2,
    color: colors.textTertiary,
    marginTop: 1,
  },
});
