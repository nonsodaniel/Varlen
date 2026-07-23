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
import { adaptTintColor } from '../src/utils/tintColors';
import { Input } from '../src/components/ui/Input';
import { GradientCard } from '../src/components/ui/GradientCard';
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
  label: string; emoji: string; color: string; bg: string;
  gradient: [string, string]; iconBg: string;
}> = {
  breakfast: { label: 'Breakfast', emoji: '\u{1F95E}', color: '#F59E0B', bg: '#FEF3C7', gradient: ['#FEF3C7', '#FFFBEB'], iconBg: '#FDE68A' },
  lunch:     { label: 'Lunch',     emoji: '\u{1F96A}', color: '#10B981', bg: '#D1FAE5', gradient: ['#D1FAE5', '#ECFDF5'], iconBg: '#A7F3D0' },
  dinner:    { label: 'Dinner',    emoji: '\u{1F37D}\u{FE0F}', color: '#8B5CF6', bg: '#EDE9FE', gradient: ['#EDE9FE', '#F5F3FF'], iconBg: '#DDD6FE' },
  snack:     { label: 'Snack',     emoji: '\u{1F34E}', color: '#EC4899', bg: '#FCE7F3', gradient: ['#FCE7F3', '#FDF2F8'], iconBg: '#FBCFE8' },
};

const FOOD_GREETINGS = [
  { text: "What's cooking?", emoji: '\u{1F373}' },
  { text: 'Hungry yet?', emoji: '\u{1F60B}' },
  { text: 'Plan your bites!', emoji: '\u{1F37D}\u{FE0F}' },
  { text: 'Feed the crew', emoji: '\u{1F969}' },
  { text: 'Meal time!', emoji: '\u{1F355}' },
];

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

  const greeting = FOOD_GREETINGS[new Date().getDate() % FOOD_GREETINGS.length];

  const weekProgress = useMemo(() => {
    let filled = 0;
    const total = weekDays.length * 4;
    weekPlan.forEach((day) => {
      if (day.breakfast) filled++;
      if (day.lunch) filled++;
      if (day.dinner) filled++;
      if (day.snacks.length > 0) filled++;
    });
    return { filled, total };
  }, [weekPlan, weekDays]);

  const getDayFilledCount = useCallback((date: string) => {
    const plan = weekPlan.find((d) => d.date === date);
    if (!plan) return 0;
    let count = 0;
    if (plan.breakfast) count++;
    if (plan.lunch) count++;
    if (plan.dinner) count++;
    if (plan.snacks.length > 0) count++;
    return count;
  }, [weekPlan]);

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
      // Clear the slot by setting undefined
      await setMealForDay(selectedDay, slot as 'breakfast' | 'lunch' | 'dinner', undefined);
    } catch {
      showAlert('Error', 'Could not remove meal.');
    }
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Gradient Hero Header ── */}
        <View style={styles.heroWrapper}>
          <GradientCard
            colors={['#F97316', '#FB923C', '#FDBA74']}
            style={styles.heroGradient}
            borderRadius={radius['2xl']}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroTopRow}>
                <PressableScale onPress={() => router.back()} style={styles.heroBtn}>
                  <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.9)" />
                </PressableScale>
                <PressableScale onPress={() => setShowAddMeal(true)} style={styles.heroBtn}>
                  <Ionicons name="add" size={20} color="rgba(255,255,255,0.9)" />
                </PressableScale>
              </View>
              <Text style={styles.heroGreeting}>
                {greeting.text} {greeting.emoji}
              </Text>
              <Text style={styles.heroSubtitle}>{format(new Date(), 'EEEE, MMMM d')}</Text>
              <View style={styles.heroProgressRow}>
                <View style={styles.heroProgressItem}>
                  <Ionicons name="restaurant" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.heroProgressText}>{weekProgress.filled}/{weekProgress.total} meals planned</Text>
                </View>
                <View style={styles.heroProgressDot} />
                <View style={styles.heroProgressItem}>
                  <Ionicons name="calendar" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.heroProgressText}>This week</Text>
                </View>
              </View>
            </View>
          </GradientCard>
        </View>

        {/* ── Week Day Selector ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekRow}>
          {weekDays.map((day, index) => {
            const isSelected = day.date === selectedDay;
            const isToday = day.date === format(new Date(), 'yyyy-MM-dd');
            const filledCount = getDayFilledCount(day.date);
            return (
              <AnimatedCardEntrance key={day.date} index={index}>
                <PressableScale
                  onPress={() => { haptics.selection(); setSelectedDay(day.date); }}
                >
                  {isSelected ? (
                    <LinearGradient colors={['#F97316', '#FB923C']} style={styles.dayPill}>
                      <Text style={[styles.dayLabel, styles.dayLabelActive]}>{day.dayLabel}</Text>
                      <Text style={[styles.dayNum, styles.dayNumActive]}>{day.dayNum}</Text>
                      <View style={styles.dayDotRow}>
                        {[0, 1, 2, 3].map((i) => (
                          <View key={i} style={[styles.slotDot, { backgroundColor: i < filledCount ? '#FFFFFF' : 'rgba(255,255,255,0.3)' }]} />
                        ))}
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={styles.dayPill}>
                      <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                      <Text style={styles.dayNum}>{day.dayNum}</Text>
                      <View style={styles.dayDotRow}>
                        {[0, 1, 2, 3].map((i) => (
                          <View key={i} style={[styles.slotDot, { backgroundColor: i < filledCount ? '#F97316' : colors.borderLight }]} />
                        ))}
                      </View>
                      {isToday && <View style={styles.todayDot} />}
                    </View>
                  )}
                </PressableScale>
              </AnimatedCardEntrance>
            );
          })}
        </ScrollView>

        {/* ── Meal Slots ── */}
        <View style={styles.slotsContainer}>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map((slot, index) => {
            const config = SLOT_CONFIG[slot];
            const meal = getSlotMeal(slot);
            const hasMeal = !!meal;

            const cardContent = (
              <PressableScale onPress={() => openSlotPicker(slot)}>
                <LinearGradient colors={config.gradient.map(c => adaptTintColor(c, isDark)) as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.slotCard}>
                  <View style={[styles.slotIconWrap, { backgroundColor: adaptTintColor(config.iconBg, isDark) }]}>
                    <Text style={styles.slotEmoji}>{meal?.emoji || config.emoji}</Text>
                  </View>
                  <View style={styles.slotContent}>
                    <Text style={[styles.slotLabel, { color: config.color }]}>{config.label}</Text>
                    {meal ? (
                      <>
                        <Text style={styles.slotMealName}>{meal.name}</Text>
                        <Text style={styles.slotMeta}>{meal.prepTime} min  {'\u00B7'}  {meal.servings} servings</Text>
                      </>
                    ) : (
                      <Text style={styles.slotEmpty}>Tap to choose</Text>
                    )}
                  </View>
                  {hasMeal ? (
                    <View style={[styles.slotCheckWrap, { backgroundColor: config.color + '20' }]}>
                      <Ionicons name="checkmark" size={16} color={config.color} />
                    </View>
                  ) : (
                    <Ionicons name="add-circle-outline" size={22} color={config.color} />
                  )}
                </LinearGradient>
              </PressableScale>
            );

            return (
              <AnimatedCardEntrance key={slot} index={index}>
                {hasMeal ? (
                  <SwipeableRow
                    onSwipeLeft={() => handleRemoveMealFromSlot(slot)}
                    swipeRightEnabled={false}
                    leftIcon="close-circle"
                    leftColor={colors.error}
                  >
                    {cardContent}
                  </SwipeableRow>
                ) : (
                  cardContent
                )}
              </AnimatedCardEntrance>
            );
          })}
        </View>

        {/* ── Saved Meals Grid ── */}
        {meals.length > 0 && (
          <AnimatedCardEntrance index={5}>
            <View style={styles.savedSection}>
              <Text style={styles.savedTitle}>Your saved meals</Text>
              <Text style={styles.savedHint}>Tap a meal to assign it to today</Text>
              <View style={styles.savedGrid}>
                {meals.map((meal) => (
                  <PressableScale
                    key={meal.id}
                    onPress={() => {
                      setActiveSlot(meal.category as MealSlot);
                      handlePickMeal(meal);
                    }}
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

      {/* Meal Picker Modal */}
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

      {/* Add Custom Meal Modal */}
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

      {/* Shopping List Modal */}
      <Modal visible={showShoppingList} animationType="slide" presentationStyle="pageSheet">
        <ShoppingListPreview onClose={() => setShowShoppingList(false)} />
      </Modal>

      {/* Confetti */}
      <ConfettiBurst trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Shopping FAB */}
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
  const { colors, shadows, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const config = SLOT_CONFIG[slot];
  const relevantMeals = meals.filter((m) => m.category === slot);
  const quickOptions = QUICK_MEALS.filter((q) => q.category === slot);

  return (
    <View style={styles.pickerSafe}>
      <LinearGradient colors={config.gradient.map(c => adaptTintColor(c, isDark)) as [string, string]} style={styles.pickerHeaderGradient}>
        <TouchableOpacity onPress={onClose} style={styles.pickerCloseBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={config.color} />
        </TouchableOpacity>
        <View style={styles.pickerHeaderCenter}>
          <Text style={styles.pickerHeaderEmoji}>{config.emoji}</Text>
          <Text style={[styles.pickerTitle, { color: config.color }]}>Pick {config.label}</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.pickerContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pickerSectionTitle}>Quick picks</Text>
        <Text style={styles.pickerSectionHint}>Tap to instantly add</Text>
        <View style={styles.quickGrid}>
          {quickOptions.map((q, index) => (
            <AnimatedCardEntrance key={q.name} index={index}>
              <PressableScale
                onPress={() => { haptics.medium(); onQuickAdd(q); }}
                style={styles.quickCardOuter}
              >
                <LinearGradient colors={config.gradient.map(c => adaptTintColor(c, isDark)) as [string, string]} style={styles.quickCard}>
                  <Text style={styles.quickEmoji}>{q.emoji}</Text>
                  <Text style={styles.quickName}>{q.name}</Text>
                </LinearGradient>
              </PressableScale>
            </AnimatedCardEntrance>
          ))}
        </View>

        {relevantMeals.length > 0 && (
          <>
            <Text style={[styles.pickerSectionTitle, { marginTop: spacing.xl }]}>
              Your {config.label.toLowerCase()} meals
            </Text>
            {relevantMeals.map((meal, index) => (
              <AnimatedCardEntrance key={meal.id} index={index}>
                <PressableScale onPress={() => { haptics.light(); onPick(meal); }} style={styles.savedMealRow}>
                  <Text style={styles.savedMealEmoji}>{meal.emoji}</Text>
                  <View style={styles.savedMealInfo}>
                    <Text style={styles.savedMealName}>{meal.name}</Text>
                    <Text style={styles.savedMealMeta}>{meal.prepTime} min {'\u00B7'} {meal.servings} servings</Text>
                  </View>
                  <View style={[styles.addCircle, { backgroundColor: config.color + '15' }]}>
                    <Ionicons name="add" size={18} color={config.color} />
                  </View>
                </PressableScale>
              </AnimatedCardEntrance>
            ))}
          </>
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
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose} style={styles.headerBtn} activeOpacity={0.7}>
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
      <View style={styles.shoppingHeader}>
        <TouchableOpacity onPress={onClose} style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.pickerTitle}>Shopping List</Text>
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
            <Text style={styles.shoppingSumLabel}>meals planned</Text>
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
              Add meals with ingredients to your weekly plan to generate a shopping list.
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

  // Hero
  heroWrapper: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md },
  heroGradient: { ...shadows.lg },
  heroContent: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 28 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing['2xl'] },
  heroBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroGreeting: {
    fontSize: 26, fontWeight: '600', letterSpacing: -0.3, lineHeight: 32,
    color: 'rgba(255,255,255,0.85)', marginBottom: spacing.sm,
  },
  heroSubtitle: { ...typography.subhead, color: 'rgba(255,255,255,0.6)', marginBottom: spacing.md },
  heroProgressRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: 14, gap: spacing.sm,
  },
  heroProgressItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroProgressText: { ...typography.caption1, color: 'rgba(255,255,255,0.85)' },
  heroProgressDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.4)' },

  // Week selector
  weekRow: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, gap: spacing.sm },
  dayPill: {
    width: 56, height: 82, borderRadius: radius.lg,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 3,
    ...shadows.sm,
  },
  dayLabel: { ...typography.caption2, color: colors.textTertiary },
  dayLabelActive: { color: 'rgba(255,255,255,0.7)' },
  dayNum: { ...typography.headline, color: colors.text },
  dayNumActive: { color: '#FFFFFF' },
  dayDotRow: { flexDirection: 'row', gap: 3, marginTop: 2 },
  slotDot: { width: 4, height: 4, borderRadius: 2 },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#F97316', marginTop: 2 },

  // Meal slots
  slotsContainer: { paddingHorizontal: spacing.xl, gap: spacing.md },
  slotCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md,
  },
  slotIconWrap: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  slotEmoji: { fontSize: 28 },
  slotContent: { flex: 1 },
  slotLabel: {
    ...typography.caption1, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2,
  },
  slotMealName: { ...typography.headline, color: colors.text },
  slotMeta: { ...typography.caption1, color: colors.textSecondary, marginTop: 2 },
  slotEmpty: { ...typography.body, color: colors.textTertiary, fontStyle: 'italic' },
  slotCheckWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  // Saved meals
  savedSection: { paddingHorizontal: spacing.xl, marginTop: spacing['2xl'] },
  savedTitle: { ...typography.headline, color: colors.text, marginBottom: 2 },
  savedHint: { ...typography.caption1, color: colors.textTertiary, marginBottom: spacing.md },
  savedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  savedChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radius.full, ...shadows.sm,
  },
  savedChipEmoji: { fontSize: 18 },
  savedChipName: { ...typography.subhead, color: colors.text, maxWidth: 120 },

  // Picker
  pickerSafe: { flex: 1, backgroundColor: colors.background },
  pickerHeaderGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
  },
  pickerCloseBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  pickerHeaderCenter: { alignItems: 'center' },
  pickerHeaderEmoji: { fontSize: 28, marginBottom: 4 },
  pickerTitle: { ...typography.headline, color: colors.text },
  pickerContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  pickerSectionTitle: { ...typography.headline, color: colors.text, marginBottom: 2 },
  pickerSectionHint: { ...typography.caption1, color: colors.textTertiary, marginBottom: spacing.md },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickCardOuter: { width: '30%', borderRadius: radius.lg, overflow: 'hidden' },
  quickCard: {
    borderRadius: radius.lg, padding: spacing.lg,
    alignItems: 'center', gap: spacing.sm, minHeight: 90, justifyContent: 'center',
  },
  quickEmoji: { fontSize: 32 },
  quickName: { ...typography.subhead, color: colors.text, textAlign: 'center' },

  savedMealRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, gap: spacing.md, marginBottom: spacing.sm,
    ...shadows.sm,
  },
  savedMealEmoji: { fontSize: 28 },
  savedMealInfo: { flex: 1 },
  savedMealName: { ...typography.body, color: colors.text },
  savedMealMeta: { ...typography.caption2, color: colors.textTertiary, marginTop: 2 },
  addCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  createNewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.xl, marginTop: spacing.lg,
  },
  createNewText: { ...typography.subhead, color: colors.primary, fontWeight: '600' },

  // Add Meal Modal
  modalSafe: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.surface,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { ...typography.headline, color: colors.text },
  saveBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, borderRadius: radius.full,
  },
  saveBtnText: { ...typography.subhead, color: '#FFFFFF', fontWeight: '600' },
  modalContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  fieldLabel: { ...typography.subhead, color: colors.textSecondary, marginBottom: spacing.sm },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  emojiBtn: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent', ...shadows.soft,
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

  // Shopping FAB
  fabContainer: { position: 'absolute', bottom: 110, right: 24, zIndex: 100 },
  fabGradient: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', ...shadows.lg,
  },

  // Shopping modal header
  shoppingHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.surface,
  },

  // Shopping list preview
  shoppingSummary: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.xl, ...shadows.md,
  },
  shoppingSumItem: { flex: 1, alignItems: 'center' },
  shoppingSumNumber: { ...typography.title2, color: colors.text },
  shoppingSumLabel: { ...typography.caption1, color: colors.textSecondary, marginTop: 2 },
  shoppingSumDivider: { width: 1, backgroundColor: colors.border },
  shoppingEmpty: { alignItems: 'center', paddingVertical: spacing['2xl'], gap: spacing.sm },
  shoppingEmptyTitle: { ...typography.headline, color: colors.text },
  shoppingEmptyDesc: {
    ...typography.body, color: colors.textSecondary,
    textAlign: 'center', paddingHorizontal: spacing.xl,
  },
  shoppingCategory: { marginBottom: spacing.lg },
  shoppingCategoryTitle: {
    ...typography.subhead, color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm,
  },
  shoppingItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, marginBottom: 4, gap: spacing.sm,
  },
  shoppingItemDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  shoppingItemName: { ...typography.body, color: colors.text, flex: 1 },
  shoppingItemQty: { ...typography.caption1, color: colors.textSecondary },
});
