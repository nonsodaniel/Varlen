import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, radius } from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useListStore } from '../../src/stores/listStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useAlert } from '../../src/components/AlertProvider';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showAlert } = useAlert();
  const currentUser = useAuthStore((s) => s.user);
  const { lists, toggleItem, addItem, removeItem } = useListStore();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const [newItemName, setNewItemName] = useState('');

  const list = lists.find((l) => l.id === id);

  if (!list) {
    return (
      <View style={styles.safe}>
        <View style={styles.notFoundWrap}>
          <View style={[styles.notFoundIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="list-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.notFoundText}>List not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.notFoundBtn}>
            <Text style={styles.notFoundBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const unchecked = list.items.filter((i) => !i.checked);
  const checked = list.items.filter((i) => i.checked);
  const total = list.items.length;
  const progress = total > 0 ? Math.round(((total - unchecked.length) / total) * 100) : 0;

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;
    try {
      await addItem(list.id, {
        name: newItemName.trim(),
        quantity: 1,
        checked: false,
        addedBy: currentUser?.id ?? '',
      });
      setNewItemName('');
    } catch {
      showAlert('Error', 'Could not add item. Please try again.');
    }
  };

  return (
    <View style={styles.safe}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{list.name}</Text>
          <Text style={styles.headerSub}>{progress}% complete</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.success }]} />
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Summary */}
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              {unchecked.length === 0 ? 'All items checked off!' : `${unchecked.length} items remaining`}
            </Text>
            {list.shared && (
              <View style={styles.sharedBadge}>
                <Ionicons name="people" size={12} color={colors.primary} />
                <Text style={styles.sharedText}>Shared</Text>
              </View>
            )}
          </View>

          {/* Unchecked Items */}
          {unchecked.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.itemRow}
              onPress={() => toggleItem(list.id, item.id)}
              activeOpacity={0.6}
            >
              <View style={styles.checkbox} />
              <View style={styles.itemContent}>
                <Text style={styles.itemName}>{item.name}</Text>
                {(item.quantity > 1 || item.unit || item.category) && (
                  <Text style={styles.itemMeta}>
                    {item.quantity > 1 ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : item.unit || ''}
                    {item.category ? ` · ${item.category}` : ''}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={async () => { try { await removeItem(list.id, item.id); } catch { showAlert('Error', 'Could not remove item.'); } }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={20} color={colors.borderLight} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          {/* Checked */}
          {checked.length > 0 && (
            <>
              <View style={styles.checkedHeader}>
                <Ionicons name="checkmark-done" size={14} color={colors.success} />
                <Text style={styles.checkedTitle}>Completed ({checked.length})</Text>
              </View>
              {checked.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemRow, styles.checkedRow]}
                  onPress={() => toggleItem(list.id, item.id)}
                  activeOpacity={0.6}
                >
                  <View style={styles.checkboxChecked}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                  <Text style={styles.checkedItemName}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Add Item */}
        <View style={styles.addItemBar}>
          <TextInput
            style={styles.addItemInput}
            placeholder="Add an item..."
            placeholderTextColor={colors.textTertiary}
            value={newItemName}
            onChangeText={setNewItemName}
            onSubmitEditing={handleAddItem}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addItemButton, !newItemName.trim() && styles.addItemButtonDisabled]}
            onPress={handleAddItem}
            disabled={!newItemName.trim()}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { ...typography.headline, color: colors.text, flex: 1, textAlign: 'center' },
  headerSub: { ...typography.caption1, color: colors.success, marginTop: 1 },
  progressContainer: { paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  progressTrack: { height: 4, backgroundColor: colors.borderLight, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  content: { paddingHorizontal: spacing.xl },
  summary: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.lg,
  },
  summaryText: { ...typography.subhead, color: colors.textSecondary },
  sharedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sharedText: { ...typography.caption1, color: colors.primary, fontWeight: '500' },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  checkedRow: { opacity: 0.45 },
  checkbox: {
    width: 24, height: 24, borderRadius: 8,
    borderWidth: 2, borderColor: colors.border,
    marginRight: spacing.md,
  },
  checkboxChecked: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  itemContent: { flex: 1 },
  itemName: { ...typography.body, color: colors.text },
  checkedItemName: { ...typography.body, color: colors.textTertiary, textDecorationLine: 'line-through', flex: 1 },
  itemMeta: { ...typography.caption1, color: colors.textSecondary, fontWeight: '400', marginTop: 1 },
  checkedHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.xl, marginBottom: spacing.sm,
  },
  checkedTitle: {
    ...typography.caption1, color: colors.success, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  addItemBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  addItemInput: {
    flex: 1, ...typography.body,
    backgroundColor: colors.background, borderRadius: radius.lg,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    color: colors.text, height: 46,
  },
  addItemButton: {
    width: 46, height: 46, borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  addItemButtonDisabled: { opacity: 0.4 },
  notFoundWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  notFoundIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { ...typography.title3, color: colors.textSecondary },
  notFoundBtn: {
    backgroundColor: colors.primaryLight, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  notFoundBtnText: { ...typography.subhead, color: colors.primary },
  bottomSpacer: { height: 20 },
});
