import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { format, addDays, startOfWeek } from 'date-fns';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { Input } from '../src/components/ui/Input';
import { AnimatedCardEntrance } from '../src/components/AnimatedCardEntrance';
import { PressableScale } from '../src/components/PressableScale';
import { SwipeableRow } from '../src/components/SwipeableRow';
import { ConfettiBurst } from '../src/components/ConfettiBurst';
import { haptics } from '../src/hooks/useHaptics';
import { usePremiumGate } from '../src/hooks/usePremiumGate';
import { useMealStore } from '../src/stores/mealStore';
import { useListStore } from '../src/stores/listStore';
import { useAuthStore } from '../src/stores/authStore';
import type { Meal, MealIngredient } from '../src/types';
import { useAlert } from '../src/components/AlertProvider';

type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const SLOT_CONFIG: Record<MealSlot, {
  label: string; emoji: string; color: string; bg: string; darkBg: string;
}> = {
  breakfast: { label: 'Breakfast', emoji: '\u{1F95E}', color: '#F59E0B', bg: '#FEF3C7', darkBg: '#F59E0B22' },
  lunch:     { label: 'Lunch',     emoji: '\u{1F96A}', color: '#10B981', bg: '#D1FAE5', darkBg: '#10B98122' },
  dinner:    { label: 'Dinner',    emoji: '\u{1F37D}\u{FE0F}', color: '#8B5CF6', bg: '#EDE9FE', darkBg: '#8B5CF622' },
  snack:     { label: 'Snack',     emoji: '\u{1F34E}', color: '#EC4899', bg: '#FCE7F3', darkBg: '#EC489922' },
};

const QUICK_MEALS: { name: string; emoji: string; category: MealSlot }[] = [
  { name: 'Scrambled Eggs', emoji: '\u{1F373}', category: 'breakfast' },
  { name: 'Oatmeal', emoji: '\u{1F35C}', category: 'breakfast' },
  { name: 'Toast & Avocado', emoji: '\u{1F951}', category: 'breakfast' },
  { name: 'Smoothie', emoji: '\u{1F964}', category: 'breakfast' },
  { name: 'Sandwich', emoji: '\u{1F96A}', category: 'lunch' },
  { name: 'Salad', emoji: '\u{1F957}', category: 'lunch' },
  { name: 'Soup', emoji: '\u{1F35C}', category: 'lunch' },
  { name: 'Leftovers', emoji: '\u{1F961}', category: 'lunch' },
  { name: 'Pasta', emoji: '\u{1F35D}', category: 'dinner' },
  { name: 'Stir Fry', emoji: '\u{1F35C}', category: 'dinner' },
  { name: 'Grilled Chicken', emoji: '\u{1F357}', category: 'dinner' },
  { name: 'Pizza', emoji: '\u{1F355}', category: 'dinner' },
  { name: 'Tacos', emoji: '\u{1F32E}', category: 'dinner' },
  { name: 'Rice & Beans', emoji: '\u{1F35A}', category: 'dinner' },
  { name: 'Burgers', emoji: '\u{1F354}', category: 'dinner' },
  { name: 'Sushi', emoji: '\u{1F363}', category: 'dinner' },
  { name: 'Fruit', emoji: '\u{1F34E}', category: 'snack' },
  { name: 'Yogurt', emoji: '\u{1F95B}', category: 'snack' },
  { name: 'Nuts', emoji: '\u{1F95C}', category: 'snack' },
  { name: 'Crackers', emoji: '\u{1F36A}', category: 'snack' },
];

export default function MealPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { requirePremium } = usePremiumGate();
  const { meals, weekPlan, getMealById, addMeal, setMealForDay, fetchMeals, fetchMealPlans } = useMealStore();

  useFocusEffect(useCallback(() => { requirePremium('meal_planning'); }, [requirePremium]));
  const { showAlert } = useAlert();
  const [selectedDay, setSelectedDay] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeSlot, setActiveSlot] = useState<MealSlot>('dinner');
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiFiredRef = useRef<Set<string>>(new Set());

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return { date: format(date, 'yyyy-MM-dd'), dayLabel: format(date, 'EEE'), dayNum: format(date, 'd') };
  });

  useFocusEffect(useCallback(() => {
    fetchMeals();
    fetchMealPlans(format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd'));
  }, []));

  const todayPlan = weekPlan.find((d) => d.date === selectedDay);

  const allSlotsFilled = useMemo(() => {
    if (!todayPlan) return false;
    return !!(todayPlan.breakfast && todayPlan.lunch && todayPlan.dinner && todayPlan.snacks.length > 0);
  }, [todayPlan]);

  useEffect(() => {
    if (allSlotsFilled && !confettiFiredRef.current.has(selectedDay)) {
      confettiFiredRef.current.add(selectedDay);
      haptics.success();
      setShowConfetti(true);
    }
  }, [allSlotsFilled, selectedDay]);

  const getSlotMeal = (slot: MealSlot): Meal | undefined => {
    if (!todayPlan) return undefined;
    if (slot === 'snack') {
      return todayPlan.snacks.length > 0 ? getMealById(todayPlan.snacks[0]) : undefined;
    }
    const mealId = todayPlan[slot];
    return mealId ? getMealById(mealId) : undefined;
  };

  const handlePickMeal = async (meal: Meal) => {
    try {
      if (activeSlot === 'snack') {
        await useMealStore.getState().addSnack(selectedDay, meal.id);
      } else {
        await setMealForDay(selectedDay, activeSlot, meal.id);
      }
      haptics.medium();
      setShowPicker(false);
    } catch {
      showAlert('Error', 'Could not set meal. Please try again.');
    }
  };

  const handleQuickAdd = async (quick: { name: string; emoji: string; category: MealSlot }) => {
    const existing = meals.find((m) => m.name.toLowerCase() === quick.name.toLowerCase());
    if (existing) {
      handlePickMeal(existing);
    } else {
      try {
        await addMeal({
          name: quick.name,
          emoji: quick.emoji,
          category: quick.category,
          ingredients: [],
          prepTime: 15,
          servings: 2,
          tags: [],
        });
        const newMeal = useMealStore.getState().meals.find(
          (m) => m.name.toLowerCase() === quick.name.toLowerCase()
        );
        if (newMeal) {
          if (activeSlot === 'snack') {
            await useMealStore.getState().addSnack(selectedDay, newMeal.id);
          } else {
            await setMealForDay(selectedDay, activeSlot, newMeal.id);
          }
        }
        haptics.medium();
      } catch {
        showAlert('Error', 'Could not add meal. Please try again.');
      }
    }
    setShowPicker(false);
  };

  const openSlotPicker = (slot: MealSlot) => {
    haptics.light();
    setActiveSlot(slot);
    setShowPicker(true);
  };

  const handleRemoveMealFromSlot = async (slot: MealSlot) => {
    haptics.warning();
    try {
      await setMealForDay(selectedDay, slot as 'breakfast' | 'lunch' | 'dinner', undefined);
    } catch {
      showAlert('Error', 'Could not remove meal.');
    }
  };

  return (
    <View style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Full-bleed Header ── */}
        <LinearGradient
          colors={['#F97316', '#FB923C', '#FDBA74']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.headerRow}>
            <PressableScale onPress={() => router.back()} style={styles.headerBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </PressableScale>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Meal Plan</Text>
              <Text style={styles.headerDate}>{format(new Date(), 'EEEE, MMM d')}</Text>
            </View>
            <PressableScale onPress={() => setShowAddMeal(true)} style={styles.headerBtn}>
              <Ionicons name="add" size={22} color="#fff" />
            </PressableScale>
          </View>
        </LinearGradient>

        {/* ── Day Selector ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
          {weekDays.map((day) => {
            const isSelected = day.date === selectedDay;
            const isToday = day.date === format(new Date(), 'yyyy-MM-dd');
            return (
              <PressableScale
                key={day.date}
                onPress={() => { haptics.selection(); setSelectedDay(day.date); }}
                style={[styles.dayPill, isSelected && styles.dayPillActive]}
              >
                <Text style={[styles.dayLabel, isSelected && styles.dayLabelActive]}>{day.dayLabel}</Text>
                <Text style={[styles.dayNum, isSelected && styles.dayNumActive]}>{day.dayNum}</Text>
                {isToday && !isSelected && <View style={styles.todayDot} />}
              </PressableScale>
            );
          })}
        </ScrollView>

        {/* ── Meal Slots ── */}
        <View style={styles.slotsSection}>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map((slot, index) => {
            const config = SLOT_CONFIG[slot];
            const meal = getSlotMeal(slot);

            const card = (
              <PressableScale onPress={() => openSlotPicker(slot)} style={styles.slotCard}>
                <View style={[styles.slotIconBox, { backgroundColor: isDark ? config.darkBg : config.bg }]}>
                  <Text style={styles.slotEmoji}>{meal?.emoji || config.emoji}</Text>
                </View>
                <View style={styles.slotInfo}>
                  <Text style={[styles.slotLabel, { color: config.color }]}>{config.label}</Text>
                  <Text style={[styles.slotMealName, !meal && styles.slotEmpty]} numberOfLines={1}>
                    {meal ? meal.name : 'Tap to add'}
                  </Text>
                </View>
                {meal
                  ? <Ionicons name="checkmark-circle" size={24} color={config.color} />
                  : <Ionicons name="add-circle-outline" size={24} color={colors.textTertiary} />
                }
              </PressableScale>
            );

            return (
              <AnimatedCardEntrance key={slot} index={index}>
                {meal ? (
                  <SwipeableRow
                    onSwipeLeft={() => handleRemoveMealFromSlot(slot)}
                    swipeRightEnabled={false}
                    leftIcon="close-circle"
                    leftColor={colors.error}
                  >
                    {card}
                  </SwipeableRow>
                ) : card}
              </AnimatedCardEntrance>
            );
          })}
        </View>

        {/* ── Saved Meals ── */}
        {meals.length > 0 && (
          <AnimatedCardEntrance index={5}>
            <View style={styles.savedSection}>
              <Text style={styles.savedTitle}>Your meals</Text>
              <View style={styles.savedGrid}>
                {meals.map((meal) => (
                  <PressableScale
                    key={meal.id}
                    onPress={() => { setActiveSlot(meal.category as MealSlot); handlePickMeal(meal); }}
                    style={styles.savedChip}
                  >
                    <Text style={styles.savedChipEmoji}>{meal.emoji}</Text>
                    <Text style={styles.savedChipName} numberOfLines={1}>{meal.name}</Text>
                  </PressableScale>
                ))}
              </View>
            </View>
          </AnimatedCardEntrance>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Modals ── */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
        <MealPicker
          slot={activeSlot}
          meals={meals}
          onPick={handlePickMeal}
          onQuickAdd={handleQuickAdd}
          onClose={() => setShowPicker(false)}
          onCreateNew={() => { setShowPicker(false); setShowAddMeal(true); }}
        />
      </Modal>

      <Modal visible={showAddMeal} animationType="slide" presentationStyle="pageSheet">
        <AddMealModal
          defaultCategory={activeSlot}
          onClose={() => setShowAddMeal(false)}
          onSave={async (meal) => {
            try {
              await addMeal(meal);
              haptics.success();
            } catch {
              showAlert('Error', 'Could not save meal. Please try again.');
            }
            setShowAddMeal(false);
          }}
        />
      </Modal>

      <Modal visible={showShoppingList} animationType="slide" presentationStyle="pageSheet">
        <ShoppingListPreview onClose={() => setShowShoppingList(false)} />
      </Modal>

      <ConfettiBurst trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {weekPlan.length > 0 && (
        <Animated.View entering={FadeInUp.delay(400).springify().damping(14).stiffness(200)} style={styles.fabContainer}>
          <PressableScale onPress={() => { haptics.medium(); setShowShoppingList(true); }}>
            <LinearGradient colors={['#10B981', '#34D399']} style={styles.fabGradient}>
              <Ionicons name="cart-outline" size={24} color="#FFFFFF" />
            </LinearGradient>
          </PressableScale>
        </Animated.View>
      )}
    </View>
  );
}

// ─── MEAL PICKER ─────────────────────────────────────────────

function MealPicker({
  slot, meals, onPick, onQuickAdd, onClose, onCreateNew,
}: {
  slot: MealSlot; meals: Meal[];
  onPick: (meal: Meal) => void;
  onQuickAdd: (q: { name: string; emoji: string; category: MealSlot }) => void;
  onClose: () => void; onCreateNew: () => void;
}) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const config = SLOT_CONFIG[slot];
  const relevantMeals = meals.filter((m) => m.category === slot);
  const quickOptions = QUICK_MEALS.filter((q) => q.category === slot);

  return (
    <View style={styles.pickerSafe}>
      {/* Handle + Header */}
      <View style={styles.pickerHandleBar}>
        <View style={styles.pickerHandle} />
      </View>
      <View style={styles.pickerHeader}>
        <Text style={styles.pickerHeaderEmoji}>{config.emoji}</Text>
        <Text style={styles.pickerTitle}>Pick {config.label}</Text>
        <TouchableOpacity onPress={onClose} style={styles.pickerCloseBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.pickerContent} showsVerticalScrollIndicator={false}>

        {/* Quick picks */}
        <View style={styles.quickGrid}>
          {quickOptions.map((q, index) => (
            <AnimatedCardEntrance key={q.name} index={index}>
              <PressableScale
                onPress={() => { haptics.medium(); onQuickAdd(q); }}
                style={styles.quickCard}
              >
                <Text style={styles.quickEmoji}>{q.emoji}</Text>
                <Text style={styles.quickName}>{q.name}</Text>
              </PressableScale>
            </AnimatedCardEntrance>
          ))}
        </View>

        {/* Saved meals */}
        {relevantMeals.length > 0 && (
          <View style={styles.savedMealsSection}>
            <Text style={styles.savedMealsSectionTitle}>Saved</Text>
            {relevantMeals.map((meal, index) => (
              <AnimatedCardEntrance key={meal.id} index={index}>
                <PressableScale onPress={() => { haptics.light(); onPick(meal); }} style={styles.savedMealRow}>
                  <Text style={styles.savedMealEmoji}>{meal.emoji}</Text>
                  <View style={styles.savedMealInfo}>
                    <Text style={styles.savedMealName}>{meal.name}</Text>
                    <Text style={styles.savedMealMeta}>{meal.prepTime} min · {meal.servings} servings</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color={config.color} />
                </PressableScale>
              </AnimatedCardEntrance>
            ))}
          </View>
        )}

        <PressableScale onPress={() => { haptics.light(); onCreateNew(); }} style={styles.createNewBtn}>
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={styles.createNewText}>Create a custom meal</Text>
        </PressableScale>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ─── ADD MEAL MODAL ──────────────────────────────────────────

function AddMealModal({
  defaultCategory, onClose, onSave,
}: {
  defaultCategory: MealSlot; onClose: () => void;
  onSave: (meal: Omit<Meal, 'id'>) => void;
}) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MealSlot>(defaultCategory);
  const [emoji, setEmoji] = useState('\u{1F37D}\u{FE0F}');
  const [prepTime, setPrepTime] = useState('15');
  const [servings, setServings] = useState('2');

  const handleSave = () => {
    if (!name.trim()) return;
    Keyboard.dismiss();
    haptics.success();
    onSave({
      name: name.trim(),
      category,
      emoji,
      prepTime: parseInt(prepTime) || 15,
      servings: parseInt(servings) || 2,
      ingredients: [],
      tags: [],
    });
  };

  const EMOJI_OPTIONS = ['\u{1F37D}\u{FE0F}', '\u{1F355}', '\u{1F35D}', '\u{1F957}', '\u{1F96A}', '\u{1F35A}', '\u{1F32E}', '\u{1F354}', '\u{1F363}', '\u{1F373}', '\u{1F95E}', '\u{1F35C}'];

  return (
    <View style={styles.modalSafe}>
      <View style={styles.pickerHandleBar}>
        <View style={styles.pickerHandle} />
      </View>
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>New Meal</Text>
        <PressableScale
          onPress={handleSave}
          disabled={!name.trim()}
          style={[styles.saveBtn, !name.trim() && { opacity: 0.4 }]}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
        <Input label="What's the meal?" placeholder="e.g. Chicken Alfredo" value={name} onChangeText={setName} />

        <Text style={styles.fieldLabel}>Pick an icon</Text>
        <View style={styles.emojiGrid}>
          {EMOJI_OPTIONS.map((e) => (
            <PressableScale
              key={e}
              onPress={() => { haptics.light(); setEmoji(e); }}
              style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
            >
              <Text style={styles.emojiBtnText}>{e}</Text>
            </PressableScale>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.catRow}>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map((cat) => {
            const config = SLOT_CONFIG[cat];
            const active = category === cat;
            return (
              <PressableScale
                key={cat}
                onPress={() => { haptics.selection(); setCategory(cat); }}
                style={[styles.catChip, active && { backgroundColor: config.color, borderColor: config.color }]}
              >
                <Text style={{ fontSize: 14 }}>{config.emoji}</Text>
                <Text style={[styles.catChipText, active && { color: '#fff' }]}>{config.label}</Text>
              </PressableScale>
            );
          })}
        </View>

        <View style={styles.rowInputs}>
          <View style={{ flex: 1 }}>
            <Input label="Prep time (min)" placeholder="15" value={prepTime} onChangeText={setPrepTime} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Servings" placeholder="2" value={servings} onChangeText={setServings} keyboardType="number-pad" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── SHOPPING LIST PREVIEW ───────────────────────────────────

function ShoppingListPreview({ onClose }: { onClose: () => void }) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { generateShoppingList, weekPlan, getMealById } = useMealStore();
  const { addList, addItem } = useListStore();
  const userId = useAuthStore.getState().user?.id ?? '';
  const [creating, setCreating] = useState(false);
  const { showAlert } = useAlert();

  const ingredients = generateShoppingList();

  const grouped = ingredients.reduce<Record<string, MealIngredient[]>>((acc, ing) => {
    const cat = ing.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ing);
    return acc;
  }, {});

  const mealCount = weekPlan.reduce((count, day) => {
    return count + (day.breakfast ? 1 : 0) + (day.lunch ? 1 : 0) + (day.dinner ? 1 : 0) + day.snacks.length;
  }, 0);

  const handleCreateList = async () => {
    if (ingredients.length === 0) return;
    haptics.medium();
    setCreating(true);
    try {
      const listName = `Meal Plan - ${format(new Date(), 'MMM d')}`;
      await addList({ name: listName, shared: true, createdBy: userId });
      const lists = useListStore.getState().lists;
      const newList = lists.find((l) => l.name === listName);
      if (newList) {
        for (const ing of ingredients) {
          await addItem(newList.id, {
            name: `${ing.name}${ing.quantity ? ` (${ing.quantity} ${ing.unit})` : ''}`,
            quantity: 1, unit: ing.unit, checked: false, category: ing.category, addedBy: userId,
          });
        }
      }
      haptics.success();
      showAlert('Shopping List Created', `Added ${ingredients.length} items to "${listName}".`);
      onClose();
    } catch {
      showAlert('Error', 'Could not create shopping list.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.pickerSafe}>
      <View style={styles.pickerHandleBar}>
        <View style={styles.pickerHandle} />
      </View>
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Shopping List</Text>
        <PressableScale
          onPress={handleCreateList}
          disabled={ingredients.length === 0 || creating}
          style={[styles.saveBtn, (ingredients.length === 0 || creating) && { opacity: 0.4 }]}
        >
          <Text style={styles.saveBtnText}>{creating ? 'Creating...' : 'Create'}</Text>
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={styles.pickerContent} showsVerticalScrollIndicator={false}>
        <View style={styles.shoppingSummary}>
          <View style={styles.shoppingSumItem}>
            <Text style={styles.shoppingSumNumber}>{mealCount}</Text>
            <Text style={styles.shoppingSumLabel}>meals</Text>
          </View>
          <View style={styles.shoppingSumDivider} />
          <View style={styles.shoppingSumItem}>
            <Text style={styles.shoppingSumNumber}>{ingredients.length}</Text>
            <Text style={styles.shoppingSumLabel}>ingredients</Text>
          </View>
          <View style={styles.shoppingSumDivider} />
          <View style={styles.shoppingSumItem}>
            <Text style={styles.shoppingSumNumber}>{Object.keys(grouped).length}</Text>
            <Text style={styles.shoppingSumLabel}>categories</Text>
          </View>
        </View>

        {ingredients.length === 0 ? (
          <View style={styles.shoppingEmpty}>
            <Ionicons name="cart-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.shoppingEmptyTitle}>No ingredients yet</Text>
            <Text style={styles.shoppingEmptyDesc}>
              Add meals with ingredients to generate a shopping list.
            </Text>
          </View>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <View key={category} style={styles.shoppingCategory}>
              <Text style={styles.shoppingCategoryTitle}>{category}</Text>
              {items.map((ing, idx) => (
                <View key={`${ing.name}-${idx}`} style={styles.shoppingItem}>
                  <View style={styles.shoppingItemDot} />
                  <Text style={styles.shoppingItemName}>{ing.name}</Text>
                  {ing.quantity ? (
                    <Text style={styles.shoppingItemQty}>{ing.quantity} {ing.unit}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ))
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ─── STYLES ────────────────────────────────────────────────

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Header (full-bleed)
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  headerDate: { fontSize: 13, color: 'rgba(255,255,255,0.72)', marginTop: 2 },

  // Day selector
  daysRow: { paddingHorizontal: 16, paddingVertical: 16, gap: 8 },
  dayPill: {
    width: 52, height: 66, borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', gap: 3,
    ...shadows.sm,
  },
  dayPillActive: { backgroundColor: '#F97316' },
  dayLabel: { fontSize: 11, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase' },
  dayLabelActive: { color: 'rgba(255,255,255,0.75)' },
  dayNum: { fontSize: 20, fontWeight: '700', color: colors.text },
  dayNumActive: { color: '#fff' },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#F97316' },

  // Meal slots
  slotsSection: { paddingHorizontal: 16, gap: 10 },
  slotCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 18,
    padding: 14, gap: 14, ...shadows.sm,
  },
  slotIconBox: {
    width: 54, height: 54, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  slotEmoji: { fontSize: 26 },
  slotInfo: { flex: 1 },
  slotLabel: {
    fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3,
  },
  slotMealName: { fontSize: 15, fontWeight: '600', color: colors.text },
  slotEmpty: { color: colors.textTertiary, fontStyle: 'italic', fontWeight: '400' },

  // Saved meals
  savedSection: { paddingHorizontal: 16, marginTop: 24 },
  savedTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  savedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  savedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 999, ...shadows.sm,
  },
  savedChipEmoji: { fontSize: 16 },
  savedChipName: { fontSize: 13, color: colors.text, maxWidth: 120 },

  // FAB
  fabContainer: { position: 'absolute', bottom: 110, right: 24, zIndex: 100 },
  fabGradient: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', ...shadows.lg,
  },

  // Modal shared
  pickerSafe: { flex: 1, backgroundColor: colors.background },
  pickerHandleBar: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  pickerHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border },

  pickerHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, gap: 10,
  },
  pickerHeaderEmoji: { fontSize: 24 },
  pickerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
  pickerCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  pickerContent: { paddingHorizontal: 16, paddingTop: 8 },

  // Quick grid
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    width: '30%', borderRadius: 16,
    backgroundColor: colors.surface,
    padding: 14, alignItems: 'center', gap: 8,
    minHeight: 84, justifyContent: 'center',
    ...shadows.sm,
  },
  quickEmoji: { fontSize: 30 },
  quickName: { fontSize: 12, color: colors.text, textAlign: 'center', fontWeight: '500' },

  // Saved meals in picker
  savedMealsSection: { marginTop: 24 },
  savedMealsSectionTitle: {
    fontSize: 13, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 10,
  },
  savedMealRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 14,
    padding: 14, gap: 12, marginBottom: 8, ...shadows.sm,
  },
  savedMealEmoji: { fontSize: 26 },
  savedMealInfo: { flex: 1 },
  savedMealName: { fontSize: 15, color: colors.text, fontWeight: '600' },
  savedMealMeta: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },

  createNewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 20, marginTop: 12,
  },
  createNewText: { fontSize: 14, color: colors.primary, fontWeight: '600' },

  // Add Meal Modal
  modalSafe: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  saveBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 16,
    paddingVertical: 8, borderRadius: 999,
  },
  saveBtnText: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  modalContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  fieldLabel: { ...typography.subhead, color: colors.textSecondary, marginBottom: spacing.sm },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  emojiBtn: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  emojiBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  emojiBtnText: { fontSize: 24 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
  },
  catChipText: { ...typography.subhead, color: colors.textSecondary },
  rowInputs: { flexDirection: 'row', gap: spacing.md },

  // Shopping list
  shoppingSummary: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: 18, padding: 20, marginBottom: 20, ...shadows.md,
  },
  shoppingSumItem: { flex: 1, alignItems: 'center' },
  shoppingSumNumber: { fontSize: 24, fontWeight: '700', color: colors.text },
  shoppingSumLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  shoppingSumDivider: { width: 1, backgroundColor: colors.border },
  shoppingEmpty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  shoppingEmptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  shoppingEmptyDesc: {
    fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20,
  },
  shoppingCategory: { marginBottom: 20 },
  shoppingCategoryTitle: {
    fontSize: 13, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  shoppingItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  shoppingItemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  shoppingItemName: { flex: 1, fontSize: 15, color: colors.text },
  shoppingItemQty: { fontSize: 13, color: colors.textSecondary },
});
