import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal,
  TextInput, Keyboard, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format, addDays, startOfWeek } from 'date-fns';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { AnimatedCardEntrance } from '../src/components/AnimatedCardEntrance';
import { ConfettiBurst } from '../src/components/ConfettiBurst';
import { haptics } from '../src/hooks/useHaptics';
import { usePremiumGate } from '../src/hooks/usePremiumGate';
import { useMealStore } from '../src/stores/mealStore';
import { useListStore } from '../src/stores/listStore';
import { useAuthStore } from '../src/stores/authStore';
import type { Meal, MealIngredient } from '../src/types';
import { useAlert } from '../src/components/AlertProvider';

type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const SLOT_CONFIG: Record<MealSlot, { label: string; emoji: string; time: string; color: string; bg: string; darkBg: string }> = {
  breakfast: { label: 'Breakfast', emoji: '🍳', time: 'Morning',  color: '#D97706', bg: '#FEF3C7', darkBg: '#78350F' },
  lunch:     { label: 'Lunch',     emoji: '🥗', time: 'Midday',   color: '#059669', bg: '#D1FAE5', darkBg: '#064E3B' },
  dinner:    { label: 'Dinner',    emoji: '🍽️', time: 'Evening',  color: '#7C3AED', bg: '#EDE9FE', darkBg: '#3B0764' },
  snack:     { label: 'Snack',     emoji: '🍎', time: 'Anytime',  color: '#DB2777', bg: '#FCE7F3', darkBg: '#500724' },
};

const MAIN_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

export default function MealPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { requirePremium } = usePremiumGate();
  const { meals, weekPlan, getMealById, addMeal, addMealToSlot, removeMealFromSlot, fetchMeals, fetchMealPlans } = useMealStore();
  const { showAlert } = useAlert();

  useFocusEffect(useCallback(() => { requirePremium('meal_planning'); }, [requirePremium]));

  const [selectedDay, setSelectedDay] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeSlot, setActiveSlot] = useState<MealSlot>('breakfast');
  const [showEntry, setShowEntry] = useState(false);
  const [showShopping, setShowShopping] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiFiredRef = useRef<Set<string>>(new Set());

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return { date: format(date, 'yyyy-MM-dd'), dayLabel: format(date, 'EEE'), dayNum: format(date, 'd') };
  }), []);

  useFocusEffect(useCallback(() => {
    fetchMeals();
    fetchMealPlans(format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd'));
  }, []));

  const todayPlan = weekPlan.find((d) => d.date === selectedDay);

  const filledCount = useMemo(() => {
    if (!todayPlan) return 0;
    return (todayPlan.breakfast.length > 0 ? 1 : 0) +
           (todayPlan.lunch.length > 0 ? 1 : 0) +
           (todayPlan.dinner.length > 0 ? 1 : 0);
  }, [todayPlan]);

  useEffect(() => {
    if (filledCount === 3 && !confettiFiredRef.current.has(selectedDay)) {
      confettiFiredRef.current.add(selectedDay);
      haptics.success();
      setShowConfetti(true);
    }
  }, [filledCount, selectedDay]);

  const getSlotMeals = useCallback((slot: MealSlot): Meal[] => {
    if (!todayPlan) return [];
    const key = slot === 'snack' ? 'snacks' : slot;
    const ids: string[] = (todayPlan[key] as string[]) || [];
    return ids.map((id) => getMealById(id)).filter((m): m is Meal => !!m);
  }, [todayPlan, getMealById]);

  const handleOpenSlot = (slot: MealSlot) => {
    haptics.light();
    setActiveSlot(slot);
    setShowEntry(true);
  };

  const handleRemoveMeal = async (slot: MealSlot, mealId: string) => {
    haptics.warning();
    try {
      await removeMealFromSlot(selectedDay, slot, mealId);
    } catch {
      showAlert('Error', 'Could not remove meal.');
    }
  };

  // Find-or-create a meal, then assign it to the day slot
  const handleAssignMeal = useCallback(async (slot: MealSlot, mealName: string) => {
    const trimmed = mealName.trim();
    if (!trimmed) return;
    setShowEntry(false);
    haptics.medium();
    try {
      let mealId: string | undefined;

      // Check if we already have a meal with this name+category
      const existing = meals.find(
        (m) => m.name.toLowerCase() === trimmed.toLowerCase() && m.category === slot,
      );

      if (existing) {
        mealId = existing.id;
      } else {
        const config = SLOT_CONFIG[slot];
        await addMeal({
          name: trimmed,
          category: slot,
          emoji: config.emoji,
          prepTime: 0,
          servings: 1,
          ingredients: [],
          tags: [],
        });
        const created = useMealStore.getState().meals.find(
          (m) => m.name.toLowerCase() === trimmed.toLowerCase() && m.category === slot,
        );
        mealId = created?.id;
      }

      if (mealId) {
        await addMealToSlot(selectedDay, slot, mealId);
      }
    } catch {
      showAlert('Error', 'Could not save meal. Please try again.');
    }
  }, [meals, selectedDay, addMeal, addMealToSlot]);

  const selectedDayLabel = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    if (selectedDay === today) return 'Today';
    if (selectedDay === tomorrow) return 'Tomorrow';
    return format(new Date(selectedDay + 'T12:00:00'), 'EEEE');
  }, [selectedDay]);

  const snackMeals = getSlotMeals('snack');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Meal Plan</Text>
        <TouchableOpacity
          onPress={() => setShowShopping(true)}
          hitSlop={12}
          style={[styles.headerCartBtn, { backgroundColor: isDark ? colors.elevated : '#F0FDF4', borderColor: '#BBF7D0' }]}
        >
          <Ionicons name="cart-outline" size={18} color="#059669" />
          <Text style={styles.headerCartText}>List</Text>
        </TouchableOpacity>
      </View>

      {/* Day Selector */}
      <View style={[styles.daySelectorWrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
          {weekDays.map((day) => {
            const isSelected = day.date === selectedDay;
            const isToday = day.date === format(new Date(), 'yyyy-MM-dd');
            const dayPlan = weekPlan.find((d) => d.date === day.date);
            const hasMeals = dayPlan && (dayPlan.breakfast.length > 0 || dayPlan.lunch.length > 0 || dayPlan.dinner.length > 0 || dayPlan.snacks.length > 0);
            return (
              <Pressable
                key={day.date}
                onPress={() => { haptics.selection(); setSelectedDay(day.date); }}
                style={[
                  styles.dayPill,
                  { backgroundColor: isSelected ? colors.primary : colors.background },
                ]}
              >
                <Text style={[styles.dayPillLabel, { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textTertiary }]}>
                  {day.dayLabel}
                </Text>
                <Text style={[styles.dayPillNum, { color: isSelected ? '#fff' : colors.text }]}>
                  {day.dayNum}
                </Text>
                {isToday && !isSelected && <View style={[styles.dayDot, { backgroundColor: colors.primary }]} />}
                {hasMeals && !isSelected && !isToday && <View style={[styles.dayDot, { backgroundColor: '#10B981' }]} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Day heading */}
        <Animated.View entering={FadeInDown.duration(200)} style={styles.dayRow}>
          <Text style={[styles.dayHeading, { color: colors.text }]}>{selectedDayLabel}</Text>
          <Text style={[styles.daySubheading, { color: colors.textTertiary }]}>
            {filledCount === 3 ? '✓ All meals planned' : `${filledCount} of 3 planned`}
          </Text>
        </Animated.View>

        {/* Main meal slots */}
        <View style={styles.slots}>
          {MAIN_SLOTS.map((slot, index) => {
            const config = SLOT_CONFIG[slot];
            const slotMeals = getSlotMeals(slot);
            const accentBg = isDark ? config.darkBg : config.bg;
            const firstEmoji = slotMeals[0]?.emoji || config.emoji;

            return (
              <AnimatedCardEntrance key={slot} index={index}>
                <View style={[styles.slotCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.slotIconWrap, { backgroundColor: accentBg }]}>
                    <Text style={styles.slotEmoji}>{firstEmoji}</Text>
                  </View>
                  <View style={styles.slotBody}>
                    <Text style={[styles.slotLabel, { color: config.color }]}>{config.label}</Text>
                    {slotMeals.length > 0 ? (
                      <View style={styles.slotMealList}>
                        {slotMeals.map((meal) => (
                          <View key={meal.id} style={styles.slotMealRow}>
                            <Text style={[styles.slotMealName, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                              {meal.name}
                            </Text>
                            <TouchableOpacity
                              onPress={() => handleRemoveMeal(slot, meal.id)}
                              hitSlop={8}
                            >
                              <Ionicons name="close-circle" size={18} color={colors.warning} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.slotEmpty, { color: colors.textTertiary }]}>Tap + to plan</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleOpenSlot(slot)}
                    hitSlop={10}
                    style={styles.slotAddBtn}
                  >
                    <Ionicons name="add-circle-outline" size={22} color={config.color} />
                  </TouchableOpacity>
                </View>
              </AnimatedCardEntrance>
            );
          })}
        </View>

        {/* Snack — secondary row */}
        <AnimatedCardEntrance index={3}>
          <View style={styles.snackSection}>
            <Text style={[styles.snackLabel, { color: colors.textSecondary }]}>Snack (optional)</Text>
            <View style={styles.snackChips}>
              {snackMeals.map((snackMeal) => (
                <View
                  key={snackMeal.id}
                  style={[styles.snackChip, { backgroundColor: isDark ? SLOT_CONFIG.snack.darkBg : SLOT_CONFIG.snack.bg }]}
                >
                  <Text style={styles.snackChipEmoji}>{snackMeal.emoji || '🍎'}</Text>
                  <Text style={[styles.snackChipName, { color: SLOT_CONFIG.snack.color }]} numberOfLines={1}>
                    {snackMeal.name}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveMeal('snack', snackMeal.id)} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={SLOT_CONFIG.snack.color} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.snackAddBtn, { borderColor: colors.border }]}
                onPress={() => handleOpenSlot('snack')}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color={colors.textSecondary} />
                <Text style={[styles.snackAddText, { color: colors.textSecondary }]}>Add snack</Text>
              </TouchableOpacity>
            </View>
          </View>
        </AnimatedCardEntrance>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Meal Entry Sheet */}
      <Modal visible={showEntry} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEntry(false)}>
        <MealEntrySheet
          slot={activeSlot}
          meals={meals}
          weekPlan={weekPlan}
          onAssign={(name) => handleAssignMeal(activeSlot, name)}
          onClose={() => setShowEntry(false)}
        />
      </Modal>

      {/* Shopping List Sheet */}
      <Modal visible={showShopping} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowShopping(false)}>
        <ShoppingListSheet onClose={() => setShowShopping(false)} />
      </Modal>

      <ConfettiBurst trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
    </View>
  );
}

// ─── MEAL ENTRY SHEET ────────────────────────────────────────────────────────
// Single unified sheet for both picking existing meals and typing new ones.

function MealEntrySheet({ slot, meals, weekPlan, onAssign, onClose }: {
  slot: MealSlot;
  meals: Meal[];
  weekPlan: import('../src/types').DayMealPlan[];
  onAssign: (name: string) => void;
  onClose: () => void;
}) {
  const { colors, isDark } = useTheme();
  const config = SLOT_CONFIG[slot];
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Only show meals that have been used in past week plans (no auto-generated suggestions)
  const suggestions = useMemo(() => {
    const usedIds = new Set(
      weekPlan.flatMap((d) => [
        ...(d.breakfast || []),
        ...(d.lunch || []),
        ...(d.dinner || []),
        ...(d.snacks || []),
      ]),
    );
    const seen = new Set<string>();
    const sorted = [...meals]
      .filter((m) => usedIds.has(m.id))
      .sort((a, b) => (a.category === slot ? -1 : b.category === slot ? 1 : 0));
    return sorted.filter((m) => {
      const key = m.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [meals, weekPlan, slot]);

  const filtered = useMemo(() => {
    if (!text.trim()) return suggestions;
    return suggestions.filter((m) => m.name.toLowerCase().includes(text.toLowerCase()));
  }, [suggestions, text]);

  const handleDone = () => {
    const name = text.trim();
    if (!name) return;
    Keyboard.dismiss();
    onAssign(name);
  };

  const handlePickExisting = (meal: Meal) => {
    Keyboard.dismiss();
    onAssign(meal.name);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.sheet, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Handle */}
      <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

      {/* Header */}
      <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} hitSlop={10}>
          <Ionicons name="chevron-down" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.sheetTitleRow}>
          <Text style={styles.sheetTitleEmoji}>{config.emoji}</Text>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>What's for {config.label.toLowerCase()}?</Text>
        </View>
        <TouchableOpacity
          onPress={handleDone}
          disabled={!text.trim()}
          style={[styles.sheetDoneBtn, { backgroundColor: text.trim() ? config.color : colors.border }]}
        >
          <Text style={styles.sheetDoneBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Text input */}
      <View style={[styles.entryInputWrap, { backgroundColor: isDark ? colors.elevated : colors.card, borderColor: colors.border }]}>
        <Text style={styles.entryInputEmoji}>{config.emoji}</Text>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          placeholder={`e.g. ${config.label === 'Breakfast' ? 'Scrambled eggs, Oatmeal' : config.label === 'Lunch' ? 'Chicken salad, Sandwich' : config.label === 'Dinner' ? 'Pasta, Grilled salmon' : 'Apple, Yogurt'}`}
          placeholderTextColor={colors.textTertiary}
          style={[styles.entryInput, { color: colors.text }]}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleDone}
          maxLength={60}
        />
        {text.length > 0 && (
          <TouchableOpacity onPress={() => setText('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Past meals / suggestions */}
      {filtered.length > 0 && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          style={{ flex: 1 }}
          contentContainerStyle={styles.suggestionsContent}
        >
          {!text.trim() && (
            <Text style={[styles.suggestionsLabel, { color: colors.textTertiary }]}>Recent meals</Text>
          )}
          <View style={styles.suggestionsList}>
            {filtered.map((meal) => (
              <TouchableOpacity
                key={meal.id}
                style={[styles.suggestionRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handlePickExisting(meal)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionEmoji}>{meal.emoji || SLOT_CONFIG[meal.category as MealSlot]?.emoji || '🍽️'}</Text>
                <Text style={[styles.suggestionName, { color: colors.text }]} numberOfLines={1}>{meal.name}</Text>
                <Ionicons name="add-circle-outline" size={20} color={config.color} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {filtered.length === 0 && text.trim() && (
        <View style={styles.noSuggestionsHint}>
          <Text style={[styles.noSuggestionsText, { color: colors.textTertiary }]}>
            Press Add to create "{text.trim()}"
          </Text>
        </View>
      )}

      {filtered.length === 0 && !text.trim() && (
        <View style={styles.noSuggestionsHint}>
          <Text style={[styles.noSuggestionsText, { color: colors.textTertiary }]}>
            Type a meal name above to get started
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── SHOPPING LIST SHEET ──────────────────────────────────────────────────────

function ShoppingListSheet({ onClose }: { onClose: () => void }) {
  const { colors, isDark } = useTheme();
  const { generateShoppingList, weekPlan } = useMealStore();
  const { addList, addItem } = useListStore();
  const userId = useAuthStore.getState().user?.id ?? '';
  const [creating, setCreating] = useState(false);
  const { showAlert } = useAlert();
  const ingredients = useMemo(() => generateShoppingList(), [weekPlan]);

  const mealCount = weekPlan.reduce(
    (n, d) => n + d.breakfast.length + d.lunch.length + d.dinner.length + d.snacks.length, 0,
  );

  const handleCreate = async () => {
    if (!ingredients.length) return;
    haptics.medium();
    setCreating(true);
    try {
      const listName = `Meal Plan — ${format(new Date(), 'MMM d')}`;
      await addList({ name: listName, shared: true, createdBy: userId });
      const newList = useListStore.getState().lists.find((l) => l.name === listName);
      if (newList) {
        for (const ing of ingredients) {
          await addItem(newList.id, {
            name: `${ing.name}${ing.quantity ? ` (${ing.quantity} ${ing.unit})` : ''}`,
            quantity: 1, unit: ing.unit, checked: false,
            category: ing.category, addedBy: userId,
          });
        }
      }
      haptics.success();
      showAlert('Done', `Added ${ingredients.length} items to "${listName}".`);
      onClose();
    } catch {
      showAlert('Error', 'Could not create shopping list.');
    } finally {
      setCreating(false);
    }
  };

  const grouped = useMemo(() => ingredients.reduce<Record<string, MealIngredient[]>>((acc, ing) => {
    const cat = ing.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ing);
    return acc;
  }, {}), [ingredients]);

  return (
    <View style={[styles.sheet, { backgroundColor: colors.background }]}>
      <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
      <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} hitSlop={10}>
          <Ionicons name="chevron-down" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.sheetTitle, { color: colors.text, flex: 1, textAlign: 'center' }]}>🛒 Shopping List</Text>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={!ingredients.length || creating}
          style={[styles.sheetDoneBtn, { backgroundColor: ingredients.length && !creating ? '#059669' : colors.border }]}
        >
          <Text style={styles.sheetDoneBtnText}>{creating ? '…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { backgroundColor: isDark ? colors.elevated : colors.card, borderColor: colors.border }]}>
        {[{ v: mealCount, l: 'meals' }, { v: ingredients.length, l: 'items' }].map((s, i) => (
          <React.Fragment key={s.l}>
            {i > 0 && <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />}
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{s.v}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{s.l}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
        {!ingredients.length ? (
          <View style={styles.sheetEmpty}>
            <Ionicons name="cart-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.sheetEmptyTitle, { color: colors.textSecondary }]}>No ingredients yet</Text>
            <Text style={[styles.sheetEmptyDesc, { color: colors.textTertiary }]}>
              Add meals with ingredients to generate a shopping list.
            </Text>
          </View>
        ) : Object.entries(grouped).map(([cat, items]) => (
          <View key={cat} style={styles.ingredientGroup}>
            <Text style={[styles.ingredientGroupTitle, { color: colors.textTertiary }]}>{cat}</Text>
            {items.map((ing, idx) => (
              <View key={`${ing.name}-${idx}`} style={[styles.ingredientRow, { borderBottomColor: colors.border }]}>
                <View style={styles.ingredientDot} />
                <Text style={[styles.ingredientName, { color: colors.text }]}>{ing.name}</Text>
                {ing.quantity ? (
                  <Text style={[styles.ingredientQty, { color: colors.textTertiary }]}>{ing.quantity} {ing.unit}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ))}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { ...typography.headline, fontWeight: '700' },
  headerCartBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  headerCartText: { fontSize: 13, fontWeight: '600', color: '#059669' },

  // Day selector
  daySelectorWrapper: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  daysRow: { paddingHorizontal: 16, gap: 6 },
  dayPill: {
    width: 50, height: 60, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  dayPillLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  dayPillNum: { fontSize: 20, fontWeight: '700' },
  dayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },

  scrollContent: { paddingTop: 20, paddingHorizontal: 16 },

  // Day heading
  dayRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 2 },
  dayHeading: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  daySubheading: { fontSize: 13 },

  // Slot cards
  slots: { gap: 10, marginBottom: 20 },
  slotCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, borderWidth: 1,
    padding: 14, gap: 12, minHeight: 72,
  },
  slotIconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  slotEmoji: { fontSize: 24 },
  slotBody: { flex: 1 },
  slotLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  slotMealName: { fontSize: 16, fontWeight: '600', lineHeight: 20 },
  slotEmpty: { fontSize: 14, lineHeight: 20 },
  slotRemoveBtn: { padding: 4 },
  slotMealList: { gap: 4, flex: 1 },
  slotMealRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  slotAddBtn: { padding: 4, marginRight: 10 },

  // Snack
  snackSection: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  snackLabel: { fontSize: 13, fontWeight: '500' },
  snackChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  snackChipEmoji: { fontSize: 15 },
  snackChipName: { fontSize: 13, fontWeight: '600', maxWidth: 120 },
  snackAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  snackAddText: { fontSize: 13, fontWeight: '500' },
  snackChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },

  // Sheet (shared)
  sheet: { flex: 1 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  sheetTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  sheetTitleEmoji: { fontSize: 20 },
  sheetTitle: { ...typography.headline, fontWeight: '700' },
  sheetDoneBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  sheetDoneBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  sheetContent: { paddingHorizontal: 16, paddingTop: 12 },

  // Entry sheet
  entryInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 16, marginBottom: 12,
    borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
    minHeight: 54,
  },
  entryInputEmoji: { fontSize: 22 },
  entryInput: { flex: 1, fontSize: 17, fontWeight: '500' },
  suggestionsContent: { paddingHorizontal: 16, paddingBottom: 20 },
  suggestionsLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  suggestionsList: { gap: 8 },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
  },
  suggestionEmoji: { fontSize: 22 },
  suggestionName: { flex: 1, fontSize: 15, fontWeight: '500' },
  noSuggestionsHint: { paddingHorizontal: 20, paddingTop: 24, alignItems: 'center' },
  noSuggestionsText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Shopping list
  statsRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 16, marginBottom: 4,
    borderRadius: radius.lg, borderWidth: 1, padding: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statsDivider: { width: 1 },
  ingredientGroup: { marginBottom: 16, paddingTop: 4 },
  ingredientGroupTitle: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 6,
  },
  ingredientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ingredientDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', flexShrink: 0 },
  ingredientName: { flex: 1, fontSize: 15 },
  ingredientQty: { fontSize: 13 },
  sheetEmpty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  sheetEmptyTitle: { fontSize: 16, fontWeight: '600' },
  sheetEmptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 240 },
});
