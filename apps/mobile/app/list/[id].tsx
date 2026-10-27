import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, radius } from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useListStore } from '../../src/stores/listStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useAlert } from '../../src/components/AlertProvider';
import { haptics } from '../../src/hooks/useHaptics';
import { ShoppingItem } from '../../src/types';

// ── Category detection ──────────────────────────────────────────────────
type CategoryKey = 'produce' | 'dairy' | 'meat' | 'bakery' | 'frozen' | 'beverages' | 'cleaning' | 'snacks' | 'pantry' | 'health' | 'general';

const CATEGORY_CONFIG: Record<CategoryKey, { icon: string; color: string; bg: string; label: string }> = {
  produce:   { icon: '🥦', color: '#10B981', bg: '#D1FAE5', label: 'Produce' },
  dairy:     { icon: '🥛', color: '#3B82F6', bg: '#DBEAFE', label: 'Dairy' },
  meat:      { icon: '🥩', color: '#EF4444', bg: '#FEE2E2', label: 'Meat & Fish' },
  bakery:    { icon: '🍞', color: '#F59E0B', bg: '#FEF3C7', label: 'Bakery' },
  frozen:    { icon: '🧊', color: '#60A5FA', bg: '#EFF6FF', label: 'Frozen' },
  beverages: { icon: '🥤', color: '#8B5CF6', bg: '#EDE9FE', label: 'Beverages' },
  cleaning:  { icon: '🧹', color: '#06B6D4', bg: '#CFFAFE', label: 'Cleaning' },
  snacks:    { icon: '🍿', color: '#F97316', bg: '#FFEDD5', label: 'Snacks' },
  pantry:    { icon: '🥫', color: '#D97706', bg: '#FEF9C3', label: 'Pantry' },
  health:    { icon: '💊', color: '#EC4899', bg: '#FCE7F3', label: 'Health' },
  general:   { icon: '🛍️', color: '#64748B', bg: '#F1F5F9', label: 'General' },
};

function detectCategory(name: string): CategoryKey {
  const n = name.toLowerCase();
  if (/apple|banana|orange|grape|strawberr|blueberr|mango|pineapple|tomato|lettuce|spinach|salad|kale|broccoli|carrot|cucumber|onion|pepper|zucchini|avocado|lemon|lime|herb|mushroom|garlic|potato|sweet potato|corn/.test(n)) return 'produce';
  if (/milk|cheese|butter|yogurt|cream|egg|dairy|cheddar|mozzarella|parmesan|brie|feta|sour cream/.test(n)) return 'dairy';
  if (/chicken|beef|pork|fish|salmon|tuna|shrimp|lamb|turkey|bacon|sausage|steak|meat|seafood/.test(n)) return 'meat';
  if (/bread|bagel|muffin|croissant|cake|cookie|pastry|bun|roll|tortilla|wrap|pita/.test(n)) return 'bakery';
  if (/frozen|ice cream|popsicle|pizza frozen/.test(n)) return 'frozen';
  if (/water|juice|soda|coffee|tea|beer|wine|drink|beverage|sparkling|kombucha|lemonade/.test(n)) return 'beverages';
  if (/soap|detergent|cleaner|bleach|sponge|trash bag|toilet paper|paper towel|dishwasher|laundry|fabric softener/.test(n)) return 'cleaning';
  if (/chip|popcorn|cracker|pretzel|nut|peanut|almond|granola bar|snack|candy|chocolate|gummy/.test(n)) return 'snacks';
  if (/oil|sauce|vinegar|spice|salt|pepper|sugar|flour|pasta|rice|noodle|soup|canned|jar|cereal|oat/.test(n)) return 'pantry';
  if (/vitamin|supplement|medicine|aspirin|bandage|shampoo|conditioner|lotion|toothpaste|deodorant/.test(n)) return 'health';
  return 'general';
}

// ── Animated checkbox ────────────────────────────────────────────────────
function AnimatedCheckbox({ checked, color }: { checked: boolean; color: string }) {
  const scale = useRef(new Animated.Value(checked ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.spring(scale, {
      toValue: checked ? 1 : 0,
      useNativeDriver: true,
      bounciness: 8,
      speed: 20,
    }).start();
  }, [checked]);

  return (
    <View style={[cbStyles.outer, checked && { borderColor: color, borderWidth: 2 }]}>
      <Animated.View style={[cbStyles.fill, { backgroundColor: color, transform: [{ scale }] }]}>
        <Ionicons name="checkmark" size={13} color="#fff" />
      </Animated.View>
    </View>
  );
}

const cbStyles = StyleSheet.create({
  outer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ── Main screen ───────────────────────────────────────────────────────────
export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showAlert } = useAlert();
  const currentUser = useAuthStore((s) => s.user);
  const { lists, toggleItem, addItem, updateItem, removeItem, deleteList } = useListStore();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const [newItemName, setNewItemName] = useState('');
  const [showChecked, setShowChecked] = useState(true);
  const inputRef = useRef<TextInput>(null);

  const list = lists.find((l) => l.id === id);

  // Animated clear-checked
  const clearAnim = useRef(new Animated.Value(1)).current;
  const trashScale = useRef(new Animated.Value(1)).current;

  const handleClearChecked = useCallback(() => {
    haptics.selection();
    // Trash icon bounce → fade+shrink checked section → remove items
    Animated.sequence([
      Animated.timing(trashScale, { toValue: 1.35, duration: 90, useNativeDriver: true }),
      Animated.timing(trashScale, { toValue: 0.85, duration: 70, useNativeDriver: true }),
      Animated.timing(trashScale, { toValue: 1, duration: 60, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(clearAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => {
        const toRemove = (list?.items ?? []).filter((i) => i.checked).map((i) => i.id);
        toRemove.forEach((itemId) => removeItem(id, itemId));
        clearAnim.setValue(1);
      });
    });
  }, [list, id, removeItem, clearAnim, trashScale]);

  const handleToggle = useCallback((itemId: string) => {
    haptics.selection();
    toggleItem(id, itemId);
  }, [id, toggleItem]);

  const handleUpdateItem = useCallback((itemId: string, name: string, quantity: number) => {
    updateItem(id, itemId, { name: name.trim() || 'Item', quantity: Math.max(1, quantity) });
  }, [id, updateItem]);

  const handleAddItem = useCallback(() => {
    const name = newItemName.trim();
    if (!name) return;
    setNewItemName('');
    haptics.light();
    // Fire-and-forget: optimistic update happens synchronously inside addItem
    addItem(id, {
      name,
      quantity: 1,
      checked: false,
      addedBy: currentUser?.id ?? '',
    });
  }, [newItemName, id, currentUser, addItem]);

  const handleRemoveItem = useCallback((itemId: string) => {
    haptics.light();
    removeItem(id, itemId);
  }, [id, removeItem]);

  const handleDeleteList = useCallback(() => {
    showAlert(
      'Delete List',
      `"${list?.name}" and all its items will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteList(id);
            router.canGoBack() ? router.back() : router.replace('/(tabs)' as any);
          },
        },
      ],
    );
  }, [list, id, deleteList, router, showAlert]);

  if (!list) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.notFoundWrap}>
          <View style={[styles.notFoundIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="cart-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.notFoundText}>List not found</Text>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} style={[styles.notFoundBtn, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.notFoundBtnText, { color: colors.primary }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const unchecked = list.items.filter((i) => !i.checked);
  const checked = list.items.filter((i) => i.checked);
  const total = list.items.length;
  const doneCount = checked.length;
  const progress = total > 0 ? (doneCount / total) : 0;
  const allDone = total > 0 && doneCount === total;

  // Determine a primary color based on category distribution
  const primaryColor = '#10B981'; // green default (grocery feel)

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{list.name}</Text>
          {total > 0 && (
            <Text style={[styles.headerSub, { color: allDone ? colors.success : colors.textSecondary }]}>
              {allDone ? '✓ All done!' : `${doneCount} of ${total} done`}
            </Text>
          )}
        </View>

        <TouchableOpacity onPress={handleDeleteList} style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* ── Progress bar ── */}
      {total > 0 && (
        <View style={[styles.progressWrap, { backgroundColor: colors.borderLight }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.round(progress * 100)}%` as any,
                backgroundColor: allDone ? colors.success : primaryColor,
              },
            ]}
          />
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Empty state ── */}
          {total === 0 && (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconWrap, { backgroundColor: '#D1FAE5' }]}>
                <Text style={{ fontSize: 40 }}>🛒</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Start your list</Text>
              <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
                Type an item below to add it to your list. Categories are detected automatically.
              </Text>
              {/* Quick add starters */}
              <View style={styles.starterRow}>
                {['Milk', 'Bread', 'Eggs', 'Apples'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.starterChip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
                    onPress={() => {
                      haptics.light();
                      addItem(id, { name: s, quantity: 1, checked: false, addedBy: currentUser?.id ?? '' });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.starterChipText, { color: colors.textSecondary }]}>+ {s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Unchecked items ── */}
          {unchecked.length > 0 && (
            <View style={[styles.itemsCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
              {unchecked.map((item, idx) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  isLast={idx === unchecked.length - 1}
                  colors={colors}
                  onToggle={() => handleToggle(item.id)}
                  onRemove={() => handleRemoveItem(item.id)}
                  onEdit={(name, qty) => handleUpdateItem(item.id, name, qty)}
                />
              ))}
            </View>
          )}

          {/* ── Checked / completed items ── */}
          {checked.length > 0 && (
            <View style={styles.checkedSection}>
              <View style={styles.checkedHeader}>
                <TouchableOpacity
                  style={styles.checkedToggle}
                  onPress={() => setShowChecked(!showChecked)}
                  activeOpacity={0.6}
                >
                  <View style={[styles.checkedDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.checkedLabel, { color: colors.success }]}>
                    Completed ({checked.length})
                  </Text>
                  <Ionicons
                    name={showChecked ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.success}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleClearChecked}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Animated.View style={{ transform: [{ scale: trashScale }] }}>
                    <Ionicons name="trash-outline" size={15} color={colors.error} />
                  </Animated.View>
                </TouchableOpacity>
              </View>

              {showChecked && (
                <Animated.View
                  style={[
                    styles.itemsCard,
                    { backgroundColor: colors.surface, ...shadows.sm, marginTop: 0, opacity: clearAnim },
                    {
                      transform: [{
                        scale: clearAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }),
                      }],
                    },
                  ]}
                >
                  {checked.map((item, idx) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      isLast={idx === checked.length - 1}
                      colors={colors}
                      onToggle={() => handleToggle(item.id)}
                      onRemove={() => handleRemoveItem(item.id)}
                      onEdit={(name, qty) => handleUpdateItem(item.id, name, qty)}
                      isChecked
                    />
                  ))}
                </Animated.View>
              )}
            </View>
          )}
        </ScrollView>

        {/* ── Add item bar ── */}
        <View style={[styles.addBar, { backgroundColor: colors.surface, borderTopColor: colors.borderLight, paddingBottom: insets.bottom + spacing.sm }]}>
          <TextInput
            ref={inputRef}
            style={[styles.addInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.borderLight }]}
            placeholder="Add an item..."
            placeholderTextColor={colors.textTertiary}
            value={newItemName}
            onChangeText={setNewItemName}
            onSubmitEditing={handleAddItem}
            returnKeyType="done"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: newItemName.trim() ? primaryColor : colors.borderLight }]}
            onPress={handleAddItem}
            disabled={!newItemName.trim()}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Item row component ────────────────────────────────────────────────────
function ItemRow({
  item,
  isLast,
  colors,
  onToggle,
  onRemove,
  onEdit,
  isChecked = false,
}: {
  item: ShoppingItem;
  isLast: boolean;
  colors: any;
  onToggle: () => void;
  onRemove: () => void;
  onEdit: (name: string, qty: number) => void;
  isChecked?: boolean;
}) {
  const cat = detectCategory(item.name);
  const catConfig = CATEGORY_CONFIG[cat];

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editQty, setEditQty] = useState(item.quantity ?? 1);
  const nameInputRef = useRef<TextInput>(null);

  // Sync edit fields when item changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditName(item.name);
      setEditQty(item.quantity ?? 1);
    }
  }, [item.name, item.quantity, isEditing]);

  // Row animation for check-off effect
  const rowAnim = useRef(new Animated.Value(1)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  const handleCheckPress = useCallback(() => {
    haptics.selection();
    if (!isChecked) {
      // Animate: green flash → slight fade → toggle
      Animated.sequence([
        Animated.timing(bgAnim, { toValue: 1, duration: 120, useNativeDriver: false }),
        Animated.timing(bgAnim, { toValue: 0, duration: 80, useNativeDriver: false }),
        Animated.timing(rowAnim, { toValue: 0.6, duration: 140, useNativeDriver: true }),
      ]).start(() => {
        rowAnim.setValue(1);
        bgAnim.setValue(0);
        onToggle();
      });
    } else {
      onToggle();
    }
  }, [isChecked, onToggle, rowAnim, bgAnim]);

  const handleOpenEdit = useCallback(() => {
    if (isChecked) return; // don't edit checked items
    haptics.light();
    setEditName(item.name);
    setEditQty(item.quantity ?? 1);
    setIsEditing(true);
    setTimeout(() => nameInputRef.current?.focus(), 80);
  }, [isChecked, item.name, item.quantity]);

  const handleCommitEdit = useCallback(() => {
    const name = editName.trim();
    if (name) {
      onEdit(name, editQty);
    }
    setIsEditing(false);
  }, [editName, editQty, onEdit]);

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', catConfig.color + '25'],
  });

  return (
    <Animated.View
      style={[
        rowStyles.rowWrap,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
        { opacity: rowAnim, backgroundColor: bgColor },
      ]}
    >
      {/* Main row */}
      <View style={rowStyles.row}>
        {/* Checkbox — only toggles */}
        <TouchableOpacity onPress={handleCheckPress} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <AnimatedCheckbox checked={isChecked} color={catConfig.color} />
        </TouchableOpacity>

        {/* Category icon */}
        <View style={[rowStyles.catIcon, { backgroundColor: catConfig.bg }]}>
          <Text style={{ fontSize: 15 }}>{catConfig.icon}</Text>
        </View>

        {/* Name + meta — tap to edit */}
        <TouchableOpacity style={rowStyles.textWrap} onPress={handleOpenEdit} activeOpacity={isChecked ? 1 : 0.6}>
          <Text
            style={[
              rowStyles.name,
              { color: isChecked ? colors.textTertiary : colors.text },
              isChecked && rowStyles.nameDone,
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View style={rowStyles.metaRow}>
            <Text style={[rowStyles.meta, { color: colors.textTertiary }]}>
              Qty: {item.quantity ?? 1}{item.unit ? ` ${item.unit}` : ''}
            </Text>
            {!isChecked && (
              <View style={[rowStyles.editChip, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="pencil-outline" size={10} color={colors.primary} />
                <Text style={[rowStyles.editChipText, { color: colors.primary }]}>Edit</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Remove */}
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={rowStyles.removeBtn}
          activeOpacity={0.6}
        >
          <Ionicons name="close" size={18} color={colors.warning} />
        </TouchableOpacity>
      </View>

      {/* Inline edit panel */}
      {isEditing && (
        <View style={[rowStyles.editPanel, { backgroundColor: colors.background, borderTopColor: colors.borderLight }]}>
          {/* Name input */}
          <TextInput
            ref={nameInputRef}
            style={[rowStyles.editNameInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.borderLight }]}
            value={editName}
            onChangeText={setEditName}
            placeholder="Item name"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="done"
            onSubmitEditing={handleCommitEdit}
          />

          {/* Quantity stepper */}
          <View style={rowStyles.qtyRow}>
            <Text style={[rowStyles.qtyLabel, { color: colors.textSecondary }]}>Qty</Text>
            <TouchableOpacity
              style={[rowStyles.qtyBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
              onPress={() => { haptics.light(); setEditQty((q) => Math.max(1, q - 1)); }}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={16} color={editQty <= 1 ? colors.textTertiary : colors.text} />
            </TouchableOpacity>
            <View style={[rowStyles.qtyValue, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Text style={[rowStyles.qtyValueText, { color: colors.text }]}>{editQty}</Text>
            </View>
            <TouchableOpacity
              style={[rowStyles.qtyBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
              onPress={() => { haptics.light(); setEditQty((q) => q + 1); }}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color={colors.text} />
            </TouchableOpacity>

            {/* Done button */}
            <TouchableOpacity
              style={[rowStyles.editDoneBtn, { backgroundColor: catConfig.color }]}
              onPress={handleCommitEdit}
              activeOpacity={0.8}
            >
              <Text style={rowStyles.editDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const rowStyles = StyleSheet.create({
  rowWrap: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  catIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  name: {
    ...typography.body,
    fontWeight: '500',
  },
  nameDone: {
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  meta: {
    ...typography.caption1,
  },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  editChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  removeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Edit panel
  editPanel: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  editNameInput: {
    height: 40,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    ...typography.body,
    marginTop: spacing.sm,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  qtyLabel: {
    ...typography.subhead,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  qtyValue: {
    width: 44,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  qtyValueText: {
    ...typography.subhead,
    fontWeight: '700',
  },
  editDoneBtn: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  editDoneBtnText: {
    ...typography.subhead,
    color: '#fff',
    fontWeight: '600',
  },
});

// ── Styles ────────────────────────────────────────────────────────────────
const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  headerTitle: {
    ...typography.title3,
    fontWeight: '700',
  },
  headerSub: {
    ...typography.caption1,
    marginTop: 2,
    fontWeight: '500',
  },

  // Progress bar
  progressWrap: {
    height: 4,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },

  // Content
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },

  // Items card
  itemsCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  // Checked section
  checkedSection: {
    marginBottom: spacing.lg,
  },
  checkedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  checkedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  checkedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  checkedLabel: {
    ...typography.subhead,
    fontWeight: '600',
    flex: 1,
  },

  // Add item bar
  addBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  addInput: {
    flex: 1,
    ...typography.body,
    height: 48,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.title3,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  emptyHint: {
    ...typography.subhead,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    maxWidth: 280,
  },
  starterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  starterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  starterChipText: {
    ...typography.subhead,
    fontWeight: '500',
  },

  // Not found
  notFoundWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  notFoundIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    ...typography.title3,
    color: '#64748B',
  },
  notFoundBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  notFoundBtnText: {
    ...typography.subhead,
    fontWeight: '600',
  },
});
