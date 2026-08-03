import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Keyboard, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { format, addDays, startOfWeek } from 'date-fns';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { Input } from '../src/components/ui/Input';
import { AnimatedCardEntrance } from '../src/components/AnimatedCardEntrance';
import { PressableScale } from '../src/components/PressableScale';
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

export default function MealPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows, isDark), [colors, shadows, isDark]);
  const { requirePremium } = usePremiumGate();
  const { meals, weekPlan, getMealById, addMeal, removeMeal, setMealForDay, removeSnack, fetchMeals, fetchMealPlans } = useMealStore();
  const { showAlert } = useAlert();

  useFocusEffect(useCallback(() => { requirePremium('meal_planning'); }, [requirePremium]));

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

  const filledCount = useMemo(() => {
    if (!todayPlan) return 0;
    return (todayPlan.breakfast ? 1 : 0) + (todayPlan.lunch ? 1 : 0) +
      (todayPlan.dinner ? 1 : 0) + (todayPlan.snacks.length > 0 ? 1 : 0);
  }, [todayPlan]);

  useEffect(() => {
    if (filledCount === 4 && !confettiFiredRef.current.has(selectedDay)) {
      confettiFiredRef.current.add(selectedDay);
      haptics.success();
      setShowConfetti(true);
    }
  }, [filledCount, selectedDay]);

  const getSlotMeal = (slot: MealSlot): Meal | undefined => {
    if (!todayPlan) return undefined;
    if (slot === 'snack') return todayPlan.snacks.length > 0 ? getMealById(todayPlan.snacks[0]) : undefined;
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

  const handleRemoveFromSlot = async (slot: MealSlot) => {
    haptics.warning();
    try {
      if (slot === 'snack') {
        const snackId = todayPlan?.snacks[0];
        if (snackId) await removeSnack(selectedDay, snackId);
      } else {
        await setMealForDay(selectedDay, slot, undefined);
      }
    } catch {
      showAlert('Error', 'Could not remove meal.');
    }
  };

  const handleDeleteMeal = (meal: Meal) => {
    Alert.alert(
      'Delete meal',
      `Remove "${meal.name}" from your meals?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            haptics.warning();
            try { await removeMeal(meal.id); } catch { showAlert('Error', 'Could not delete meal.'); }
          },
        },
      ],
    );
  };

  const openSlotPicker = (slot: MealSlot) => {
    haptics.light();
    setActiveSlot(slot);
    setShowPicker(true);
  };

  const selectedDayLabel = (() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    if (selectedDay === today) return 'Today';
    if (selectedDay === tomorrow) return 'Tomorrow';
    return format(new Date(selectedDay + 'T12:00:00'), 'EEEE');
  })();

  return (
    <View style={styles.safe}>
      {/* Header */}
      <LinearGradient
        colors={['#FF6B35', '#FF8C42']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12, zIndex: 20, elevation: 20 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.headerIconBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Meal Plan</Text>
          <Pressable onPress={() => { setActiveSlot('dinner'); setShowAddMeal(true); }} style={styles.headerIconBtn} hitSlop={12}>
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Day Selector */}
      <View style={[styles.daySelectorWrapper, { backgroundColor: colors.surface, zIndex: 10, elevation: 10 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
          {weekDays.map((day) => {
            const isSelected = day.date === selectedDay;
            const isToday = day.date === format(new Date(), 'yyyy-MM-dd');
            const dayPlan = weekPlan.find((d) => d.date === day.date);
            const hasMeals = dayPlan && (dayPlan.breakfast || dayPlan.lunch || dayPlan.dinner || dayPlan.snacks.length > 0);
            return (
              <Pressable
                key={day.date}
                onPress={() => { haptics.selection(); setSelectedDay(day.date); }}
                style={[styles.dayPill, isSelected && styles.dayPillSelected]}
              >
                <Text style={[styles.dayPillLabel, isSelected && styles.dayPillLabelSelected]}>{day.dayLabel}</Text>
                <Text style={[styles.dayPillNum, isSelected && styles.dayPillNumSelected]}>{day.dayNum}</Text>
                {hasMeals && !isSelected && <View style={styles.mealDot} />}
                {isToday && !isSelected && !hasMeals && <View style={styles.todayDot} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Day heading + progress */}
        <Animated.View entering={FadeInDown.duration(280)} style={styles.dayRow}>
          <View>
            <Text style={styles.dayHeading}>{selectedDayLabel}</Text>
            <Text style={styles.daySubheading}>{filledCount} of 4 meals planned</Text>
          </View>
          <View style={styles.progressDots}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map((s) => (
              <View key={s} style={[styles.progressDot, getSlotMeal(s) && { backgroundColor: SLOT_CONFIG[s].color }]} />
            ))}
          </View>
        </Animated.View>

        {/* Meal Slots — vertical list */}
        <View style={styles.slots}>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map((slot, index) => {
            const config = SLOT_CONFIG[slot];
            const meal = getSlotMeal(slot);
            const hasMeal = !!meal;
            const accentBg = isDark ? config.darkBg : config.bg;

            return (
              <AnimatedCardEntrance key={slot} index={index}>
                <View style={styles.slotCard}>
                  {/* Left accent */}
                  <View style={[styles.slotAccent, { backgroundColor: config.color }]} />

                  {/* Icon */}
                  <View style={[styles.slotIconWrap, { backgroundColor: accentBg }]}>
                    <Text style={styles.slotEmoji}>{hasMeal ? meal.emoji : config.emoji}</Text>
                  </View>

                  {/* Content */}
                  <View style={styles.slotBody}>
                    <Text style={[styles.slotTime, { color: colors.textTertiary }]}>{config.time}</Text>
                    <Text style={[styles.slotLabel, { color: config.color }]}>{config.label}</Text>
                    {hasMeal ? (
                      <Text style={styles.slotMealName} numberOfLines={1}>{meal.name}</Text>
                    ) : (
                      <Text style={styles.slotEmpty}>No meal planned</Text>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={styles.slotActions}>
                    {hasMeal ? (
                      <>
                        <TouchableOpacity onPress={() => openSlotPicker(slot)} style={styles.slotActionBtn} activeOpacity={0.7}>
                          <Ionicons name="swap-horizontal-outline" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleRemoveFromSlot(slot)} style={styles.slotActionBtn} activeOpacity={0.7}>
                          <Ionicons name="close-outline" size={20} color={colors.error} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity onPress={() => openSlotPicker(slot)} style={[styles.addBtn, { borderColor: config.color }]} activeOpacity={0.7}>
                        <Ionicons name="add" size={18} color={config.color} />
                        <Text style={[styles.addBtnText, { color: config.color }]}>Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </AnimatedCardEntrance>
            );
          })}
        </View>

        {/* My Meals */}
        {meals.length > 0 && (
          <AnimatedCardEntrance index={5}>
            <View style={styles.myMealsSection}>
              <View style={styles.myMealsHeader}>
                <Text style={styles.sectionTitle}>My meals</Text>
                <TouchableOpacity
                  onPress={() => { setActiveSlot('dinner'); setShowAddMeal(true); }}
                  activeOpacity={0.7}
                  style={styles.addMealLink}
                >
                  <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                  <Text style={styles.addMealLinkText}>New meal</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.myMealsList}>
                {meals.map((meal, i) => (
                  <View key={meal.id}>
                    {i > 0 && <View style={styles.myMealDivider} />}
                    <View style={styles.myMealRow}>
                      <TouchableOpacity
                        style={styles.myMealMain}
                        onPress={() => { setActiveSlot(meal.category as MealSlot); handlePickMeal(meal); }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.myMealEmoji}>{meal.emoji}</Text>
                        <View style={styles.myMealInfo}>
                          <Text style={styles.myMealName} numberOfLines={1}>{meal.name}</Text>
                          <Text style={styles.myMealMeta}>{SLOT_CONFIG[meal.category as MealSlot]?.label ?? meal.category} · {meal.prepTime} min</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteMeal(meal)} style={styles.myMealDelete} activeOpacity={0.7}>
                        <Ionicons name="trash-outline" size={17} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </AnimatedCardEntrance>
        )}

        {meals.length === 0 && (
          <View style={styles.emptyMeals}>
            <Text style={styles.emptyMealsText}>No meals saved yet. Tap + to create your first.</Text>
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Modals */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
        <MealPicker
          slot={activeSlot}
          meals={meals}
          onPick={handlePickMeal}
          onDelete={handleDeleteMeal}
          onClose={() => setShowPicker(false)}
          onCreateNew={() => { setShowPicker(false); setShowAddMeal(true); }}
        />
      </Modal>

      <Modal visible={showAddMeal} animationType="slide" presentationStyle="pageSheet">
        <AddMealModal
          defaultCategory={activeSlot}
          onClose={() => setShowAddMeal(false)}
          onSave={async (meal) => {
            try { await addMeal(meal); haptics.success(); } catch { showAlert('Error', 'Could not save meal. Please try again.'); }
            setShowAddMeal(false);
          }}
        />
      </Modal>

      <Modal visible={showShoppingList} animationType="slide" presentationStyle="pageSheet">
        <ShoppingListPreview onClose={() => setShowShoppingList(false)} />
      </Modal>

      <ConfettiBurst trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {weekPlan.length > 0 && (
        <Animated.View entering={FadeInUp.delay(300).springify()} style={[styles.fab, { bottom: insets.bottom + 20 }]}>
          <PressableScale onPress={() => { haptics.medium(); setShowShoppingList(true); }}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.fabGradient}>
              <Ionicons name="cart-outline" size={22} color="#fff" />
            </LinearGradient>
          </PressableScale>
        </Animated.View>
      )}
    </View>
  );
}

// ─── MEAL PICKER ────────────────────────────────────────────────

function MealPicker({ slot, meals, onPick, onDelete, onClose, onCreateNew }: {
  slot: MealSlot; meals: Meal[];
  onPick: (meal: Meal) => void;
  onDelete: (meal: Meal) => void;
  onClose: () => void; onCreateNew: () => void;
}) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows, false), [colors, shadows]);
  const config = SLOT_CONFIG[slot];
  const relevantMeals = meals.filter((m) => m.category === slot);

  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetEmoji}>{config.emoji}</Text>
        <Text style={styles.sheetTitle}>Add {config.label}</Text>
        <TouchableOpacity onPress={onClose} style={styles.sheetClose} activeOpacity={0.7}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
        {relevantMeals.length > 0 ? (
          <>
            <Text style={styles.pickerSectionLabel}>Your meals</Text>
            {relevantMeals.map((meal, i) => (
              <AnimatedCardEntrance key={meal.id} index={i}>
                <View style={styles.pickerMealRow}>
                  <TouchableOpacity style={styles.pickerMealMain} onPress={() => { haptics.light(); onPick(meal); }} activeOpacity={0.7}>
                    <Text style={styles.pickerMealEmoji}>{meal.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerMealName}>{meal.name}</Text>
                      <Text style={styles.pickerMealMeta}>{meal.prepTime} min · {meal.servings} servings</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={22} color={config.color} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { onDelete(meal); }} style={styles.pickerMealDelete} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </AnimatedCardEntrance>
            ))}
          </>
        ) : (
          <View style={styles.pickerEmpty}>
            <Text style={styles.pickerEmptyEmoji}>{config.emoji}</Text>
            <Text style={styles.pickerEmptyTitle}>No {config.label.toLowerCase()} meals yet</Text>
            <Text style={styles.pickerEmptyDesc}>Create your first meal and it'll appear here.</Text>
          </View>
        )}

        <PressableScale onPress={() => { haptics.light(); onCreateNew(); }} style={styles.createNewBtn}>
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.createNewText}>Create a meal</Text>
        </PressableScale>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ─── ADD MEAL MODAL ─────────────────────────────────────────────

function AddMealModal({ defaultCategory, onClose, onSave }: {
  defaultCategory: MealSlot; onClose: () => void;
  onSave: (meal: Omit<Meal, 'id'>) => void;
}) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows, false), [colors, shadows]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MealSlot>(defaultCategory);
  const [emoji, setEmoji] = useState('🍽️');
  const [prepTime, setPrepTime] = useState('15');
  const [servings, setServings] = useState('2');
  const EMOJI_OPTIONS = ['🍽️', '🍕', '🍝', '🥗', '🥪', '🍚', '🌮', '🍔', '🍣', '🍳', '🥞', '🍲', '🥘', '🌯', '🥙'];

  const handleSave = () => {
    if (!name.trim()) return;
    Keyboard.dismiss();
    haptics.success();
    onSave({ name: name.trim(), category, emoji, prepTime: parseInt(prepTime) || 15, servings: parseInt(servings) || 2, ingredients: [], tags: [] });
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <View style={styles.sheetHeader}>
        <TouchableOpacity onPress={onClose} style={styles.sheetClose} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.sheetTitle}>New Meal</Text>
        <PressableScale onPress={handleSave} disabled={!name.trim()} style={[styles.sheetSaveBtn, !name.trim() && { opacity: 0.4 }]}>
          <Text style={styles.sheetSaveBtnText}>Save</Text>
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
        <Input label="Meal name" placeholder="e.g. Chicken Alfredo" value={name} onChangeText={setName} />

        <Text style={styles.fieldLabel}>Icon</Text>
        <View style={styles.emojiGrid}>
          {EMOJI_OPTIONS.map((e) => (
            <PressableScale key={e} onPress={() => { haptics.light(); setEmoji(e); }}
              style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}>
              <Text style={{ fontSize: 24 }}>{e}</Text>
            </PressableScale>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.catRow}>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map((cat) => {
            const cfg = SLOT_CONFIG[cat];
            const active = category === cat;
            return (
              <PressableScale key={cat} onPress={() => { haptics.selection(); setCategory(cat); }}
                style={[styles.catChip, active && { backgroundColor: cfg.color, borderColor: cfg.color }]}>
                <Text style={{ fontSize: 13 }}>{cfg.emoji}</Text>
                <Text style={[styles.catChipText, active && { color: '#fff' }]}>{cfg.label}</Text>
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

// ─── SHOPPING LIST ───────────────────────────────────────────────

function ShoppingListPreview({ onClose }: { onClose: () => void }) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows, false), [colors, shadows]);
  const { generateShoppingList, weekPlan } = useMealStore();
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
  const mealCount = weekPlan.reduce((n, d) => n + (d.breakfast ? 1 : 0) + (d.lunch ? 1 : 0) + (d.dinner ? 1 : 0) + d.snacks.length, 0);

  const handleCreate = async () => {
    if (!ingredients.length) return;
    haptics.medium(); setCreating(true);
    try {
      const listName = `Meal Plan — ${format(new Date(), 'MMM d')}`;
      await addList({ name: listName, shared: true, createdBy: userId });
      const newList = useListStore.getState().lists.find((l) => l.name === listName);
      if (newList) {
        for (const ing of ingredients) {
          await addItem(newList.id, { name: `${ing.name}${ing.quantity ? ` (${ing.quantity} ${ing.unit})` : ''}`, quantity: 1, unit: ing.unit, checked: false, category: ing.category, addedBy: userId });
        }
      }
      haptics.success();
      showAlert('Done', `Added ${ingredients.length} items to "${listName}".`);
      onClose();
    } catch { showAlert('Error', 'Could not create shopping list.'); }
    finally { setCreating(false); }
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <View style={styles.sheetHeader}>
        <TouchableOpacity onPress={onClose} style={styles.sheetClose} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.sheetTitle}>Shopping List</Text>
        <PressableScale onPress={handleCreate} disabled={!ingredients.length || creating}
          style={[styles.sheetSaveBtn, (!ingredients.length || creating) && { opacity: 0.4 }]}>
          <Text style={styles.sheetSaveBtnText}>{creating ? 'Creating…' : 'Create'}</Text>
        </PressableScale>
      </View>
      <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          {[{ v: mealCount, l: 'meals' }, { v: ingredients.length, l: 'items' }, { v: Object.keys(grouped).length, l: 'categories' }].map((s, i) => (
            <React.Fragment key={s.l}>
              {i > 0 && <View style={styles.statsDivider} />}
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{s.v}</Text>
                <Text style={styles.statLabel}>{s.l}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
        {!ingredients.length ? (
          <View style={styles.pickerEmpty}>
            <Ionicons name="cart-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.pickerEmptyTitle}>No ingredients yet</Text>
            <Text style={styles.pickerEmptyDesc}>Add meals with ingredients to generate a list.</Text>
          </View>
        ) : Object.entries(grouped).map(([cat, items]) => (
          <View key={cat} style={styles.ingredientGroup}>
            <Text style={styles.ingredientGroupTitle}>{cat}</Text>
            {items.map((ing, idx) => (
              <View key={`${ing.name}-${idx}`} style={styles.ingredientRow}>
                <View style={styles.ingredientDot} />
                <Text style={styles.ingredientName}>{ing.name}</Text>
                {ing.quantity && <Text style={styles.ingredientQty}>{ing.quantity} {ing.unit}</Text>}
              </View>
            ))}
          </View>
        ))}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ─── STYLES ─────────────────────────────────────────────────────

const createStyles = (colors: any, shadows: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1, backgroundColor: colors.background },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },

  // Day selector
  daySelectorWrapper: { paddingVertical: 10, ...shadows.sm },
  daysRow: { paddingHorizontal: 16, gap: 6 },
  dayPill: {
    width: 50, height: 62, borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  dayPillSelected: { backgroundColor: '#FF6B35' },
  dayPillLabel: { fontSize: 10, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.3 },
  dayPillLabelSelected: { color: 'rgba(255,255,255,0.8)' },
  dayPillNum: { fontSize: 20, fontWeight: '700', color: colors.text },
  dayPillNumSelected: { color: '#fff' },
  mealDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FF6B35' },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary },

  scrollContent: { paddingTop: 20 },

  // Day heading
  dayRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 16,
  },
  dayHeading: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  daySubheading: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  progressDots: { flexDirection: 'row', gap: 6 },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },

  // Slot cards
  slots: { gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  slotCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 14,
    overflow: 'hidden', ...shadows.sm, minHeight: 62,
  },
  slotAccent: { width: 4, alignSelf: 'stretch' },
  slotIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  slotEmoji: { fontSize: 22 },
  slotBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 9 },
  slotTime: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1 },
  slotLabel: { fontSize: 12, fontWeight: '700', marginBottom: 3 },
  slotMealName: { fontSize: 15, fontWeight: '600', color: colors.text },
  slotEmpty: { fontSize: 13, color: colors.textTertiary },
  slotActions: { flexDirection: 'row', alignItems: 'center', paddingRight: 12, gap: 4 },
  slotActionBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5,
  },
  addBtnText: { fontSize: 13, fontWeight: '600' },

  // My meals section
  myMealsSection: { paddingHorizontal: 16, marginBottom: 8 },
  myMealsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  addMealLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addMealLinkText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  myMealsList: { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden', ...shadows.sm },
  myMealDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 46 },
  myMealRow: { flexDirection: 'row', alignItems: 'center' },
  myMealMain: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11, gap: 10 },
  myMealEmoji: { fontSize: 20 },
  myMealInfo: { flex: 1 },
  myMealName: { fontSize: 14, fontWeight: '600', color: colors.text },
  myMealMeta: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
  myMealDelete: { width: 44, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border },
  emptyMeals: { paddingHorizontal: 20, paddingVertical: 12 },
  emptyMealsText: { fontSize: 14, color: colors.textTertiary, textAlign: 'center' },

  // FAB
  fab: { position: 'absolute', right: 20, zIndex: 100 },
  fabGradient: {
    width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center', ...shadows.lg,
  },

  // Sheet (modals)
  sheet: { flex: 1, backgroundColor: colors.background },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  sheetEmoji: { fontSize: 22, marginRight: 8 },
  sheetTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
  sheetClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  sheetSaveBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  sheetSaveBtnText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  sheetContent: { paddingHorizontal: 16, paddingTop: 12 },

  // Picker
  pickerSectionLabel: {
    fontSize: 12, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  pickerMealRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 14, marginBottom: 8, ...shadows.sm, overflow: 'hidden',
  },
  pickerMealMain: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  pickerMealEmoji: { fontSize: 26 },
  pickerMealName: { fontSize: 15, color: colors.text, fontWeight: '600' },
  pickerMealMeta: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  pickerMealDelete: { width: 44, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border },
  pickerEmpty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  pickerEmptyEmoji: { fontSize: 48, marginBottom: 12 },
  pickerEmptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
  pickerEmptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  createNewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 16, marginTop: 4,
  },
  createNewText: { fontSize: 14, color: colors.primary, fontWeight: '600' },

  // Add meal modal
  fieldLabel: { ...typography.subhead, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.lg },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  emojiBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  emojiBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border },
  catChipText: { ...typography.subhead, color: colors.textSecondary },
  rowInputs: { flexDirection: 'row', gap: spacing.md },

  // Shopping list
  statsRow: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 18, padding: 20, marginBottom: 20, ...shadows.sm },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statsDivider: { width: 1, backgroundColor: colors.border },
  ingredientGroup: { marginBottom: 18 },
  ingredientGroupTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  ingredientDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  ingredientName: { flex: 1, fontSize: 15, color: colors.text },
  ingredientQty: { fontSize: 13, color: colors.textSecondary },
});
