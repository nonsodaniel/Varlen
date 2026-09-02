import React, { useState, useMemo, useRef, useCallback } from 'react';
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
  const { lists, toggleItem, addItem, removeItem, deleteList } = useListStore();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const [newItemName, setNewItemName] = useState('');
  const [showChecked, setShowChecked] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const list = lists.find((l) => l.id === id);

  const handleToggle = useCallback((itemId: string) => {
    haptics.selection();
    toggleItem(id, itemId);
  }, [id, toggleItem]);

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
        <ScrollView
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
                />
              ))}
            </View>
          )}

          {/* ── Checked / completed items ── */}
          {checked.length > 0 && (
            <View style={styles.checkedSection}>
              <TouchableOpacity
                style={styles.checkedHeader}
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

              {showChecked && (
                <View style={[styles.itemsCard, { backgroundColor: colors.surface, ...shadows.sm, marginTop: 0, opacity: 0.75 }]}>
                  {checked.map((item, idx) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      isLast={idx === checked.length - 1}
                      colors={colors}
                      onToggle={() => handleToggle(item.id)}
                      onRemove={() => handleRemoveItem(item.id)}
                      isChecked
                    />
                  ))}
                </View>
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
  isChecked = false,
}: {
  item: ShoppingItem;
  isLast: boolean;
  colors: any;
  onToggle: () => void;
  onRemove: () => void;
  isChecked?: boolean;
}) {
  const cat = detectCategory(item.name);
  const catConfig = CATEGORY_CONFIG[cat];

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      style={[
        rowStyles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
      ]}
    >
      {/* Checkbox */}
      <AnimatedCheckbox checked={isChecked} color={catConfig.color} />

      {/* Category icon */}
      <View style={[rowStyles.catIcon, { backgroundColor: catConfig.bg }]}>
        <Text style={{ fontSize: 15 }}>{catConfig.icon}</Text>
      </View>

      {/* Name + meta */}
      <View style={rowStyles.textWrap}>
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
        {(item.quantity > 1 || item.unit) && (
          <Text style={[rowStyles.meta, { color: colors.textTertiary }]}>
            Qty: {item.quantity}{item.unit ? ` ${item.unit}` : ''}
          </Text>
        )}
      </View>

      {/* Remove */}
      <TouchableOpacity
        onPress={onRemove}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={rowStyles.removeBtn}
        activeOpacity={0.6}
      >
        <Ionicons name="close" size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
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
  meta: {
    ...typography.caption1,
    marginTop: 1,
  },
  removeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
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
