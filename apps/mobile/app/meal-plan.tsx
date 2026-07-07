import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, startOfWeek } from 'date-fns';
import { colors, typography, spacing, radius, shadows } from '../src/constants/theme';
import { Input } from '../src/components/ui/Input';
import { useMealStore } from '../src/stores/mealStore';
import { useListStore } from '../src/stores/listStore';
import { useAuthStore } from '../src/stores/authStore';
import type { Meal, MealIngredient } from '../src/types';
import { useAlert } from '../src/components/AlertProvider';

type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const SLOT_CONFIG: Record<MealSlot, { label: string; emoji: string; color: string; bg: string }> = {
  breakfast: { label: 'Breakfast', emoji: '\u{1F95E}', color: '#F59E0B', bg: '#FEF3C7' },
  lunch: { label: 'Lunch', emoji: '\u{1F96A}', color: '#10B981', bg: '#D1FAE5' },
  dinner: { label: 'Dinner', emoji: '\u{1F37D}\u{FE0F}', color: '#8B5CF6', bg: '#EDE9FE' },
  snack: { label: 'Snack', emoji: '\u{1F34E}', color: '#EC4899', bg: '#FCE7F3' },
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
  const { meals, weekPlan, getMealById, addMeal, setMealForDay, fetchMeals, fetchMealPlans } = useMealStore();
  const { showAlert } = useAlert();
  const [selectedDay, setSelectedDay] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeSlot, setActiveSlot] = useState<MealSlot>('dinner');
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return { date: format(date, 'yyyy-MM-dd'), dayLabel: format(date, 'EEE'), dayNum: format(date, 'd') };
  });

  useEffect(() => {
    fetchMeals();
    fetchMealPlans(format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd'));
  }, []);

  const todayPlan = weekPlan.find((d) => d.date === selectedDay);

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
      setShowPicker(false);
    } catch {
      showAlert('Error', 'Could not set meal. Please try again.');
    }
  };

  const handleQuickAdd = async (quick: { name: string; emoji: string; category: MealSlot }) => {
    // Check if this meal already exists
    const existing = meals.find((m) => m.name.toLowerCase() === quick.name.toLowerCase());
    if (existing) {
      handlePickMeal(existing);
    } else {
      try {
        // Create the meal first, then assign
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
      } catch {
        showAlert('Error', 'Could not add meal. Please try again.');
      }
    }
    setShowPicker(false);
  };

  const openSlotPicker = (slot: MealSlot) => {
    setActiveSlot(slot);
    setShowPicker(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Meal Plan</Text>
          <Text style={styles.headerSub}>What are we eating?</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAddMeal(true)} style={styles.headerAddBtn} activeOpacity={0.7}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Week Day Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekRow}
        >
          {weekDays.map((day) => {
            const isSelected = day.date === selectedDay;
            const isToday = day.date === format(new Date(), 'yyyy-MM-dd');
            return (
              <TouchableOpacity
                key={day.date}
                style={[styles.dayPill, isSelected && styles.dayPillActive]}
                onPress={() => setSelectedDay(day.date)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayLabel, isSelected && styles.dayLabelActive]}>{day.dayLabel}</Text>
                <Text style={[styles.dayNum, isSelected && styles.dayNumActive]}>{day.dayNum}</Text>
                {isToday && <View style={[styles.todayDot, isSelected && styles.todayDotActive]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Meal Slots */}
        <View style={styles.slotsContainer}>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map((slot) => {
            const config = SLOT_CONFIG[slot];
            const meal = getSlotMeal(slot);
            return (
              <TouchableOpacity
                key={slot}
                style={styles.slotCard}
                onPress={() => openSlotPicker(slot)}
                activeOpacity={0.7}
              >
                <View style={[styles.slotIconWrap, { backgroundColor: config.bg }]}>
                  <Text style={styles.slotEmoji}>{meal?.emoji || config.emoji}</Text>
                </View>
                <View style={styles.slotContent}>
                  <Text style={styles.slotLabel}>{config.label}</Text>
                  {meal ? (
                    <Text style={styles.slotMealName}>{meal.name}</Text>
                  ) : (
                    <Text style={styles.slotEmpty}>Tap to choose</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Your Saved Meals */}
        {meals.length > 0 && (
          <View style={styles.savedSection}>
            <Text style={styles.savedTitle}>Your saved meals</Text>
            <Text style={styles.savedHint}>Tap a meal to assign it to today</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedRow}>
              {meals.slice(0, 10).map((meal) => (
                <TouchableOpacity
                  key={meal.id}
                  style={styles.savedChip}
                  onPress={() => {
                    setActiveSlot(meal.category as MealSlot);
                    handlePickMeal(meal);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.savedChipEmoji}>{meal.emoji}</Text>
                  <Text style={styles.savedChipName} numberOfLines={1}>{meal.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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
            } catch {
              showAlert('Error', 'Could not save meal. Please try again.');
            }
            setShowAddMeal(false);
          }}
        />
      </Modal>

      {/* Shopping List Modal */}
      <Modal visible={showShoppingList} animationType="slide" presentationStyle="pageSheet">
        <ShoppingListPreview
          onClose={() => setShowShoppingList(false)}
        />
      </Modal>

      {/* Generate Shopping List FAB */}
      {weekPlan.length > 0 && (
        <TouchableOpacity
          style={styles.shoppingFab}
          onPress={() => setShowShoppingList(true)}
          activeOpacity={0.9}
        >
          <Ionicons name="cart-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

// ─── MEAL PICKER ─────────────────────────────────────────────

function MealPicker({
  slot,
  meals,
  onPick,
  onQuickAdd,
  onClose,
  onCreateNew,
}: {
  slot: MealSlot;
  meals: Meal[];
  onPick: (meal: Meal) => void;
  onQuickAdd: (q: { name: string; emoji: string; category: MealSlot }) => void;
  onClose: () => void;
  onCreateNew: () => void;
}) {
  const config = SLOT_CONFIG[slot];
  const relevantMeals = meals.filter((m) => m.category === slot);
  const quickOptions = QUICK_MEALS.filter((q) => q.category === slot);

  return (
    <SafeAreaView style={styles.pickerSafe} edges={['top']}>
      <View style={styles.pickerHeader}>
        <TouchableOpacity onPress={onClose} style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.pickerTitle}>Pick {config.label}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.pickerContent} showsVerticalScrollIndicator={false}>
        {/* Quick picks */}
        <Text style={styles.pickerSectionTitle}>Quick picks</Text>
        <Text style={styles.pickerSectionHint}>Tap to instantly add</Text>
        <View style={styles.quickGrid}>
          {quickOptions.map((q) => (
            <TouchableOpacity
              key={q.name}
              style={styles.quickCard}
              onPress={() => onQuickAdd(q)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickEmoji}>{q.emoji}</Text>
              <Text style={styles.quickName}>{q.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Your saved meals for this category */}
        {relevantMeals.length > 0 && (
          <>
            <Text style={[styles.pickerSectionTitle, { marginTop: spacing.xl }]}>Your {config.label.toLowerCase()} meals</Text>
            {relevantMeals.map((meal) => (
              <TouchableOpacity
                key={meal.id}
                style={styles.savedMealRow}
                onPress={() => onPick(meal)}
                activeOpacity={0.7}
              >
                <Text style={styles.savedMealEmoji}>{meal.emoji}</Text>
                <View style={styles.savedMealInfo}>
                  <Text style={styles.savedMealName}>{meal.name}</Text>
                  <Text style={styles.savedMealMeta}>
                    {meal.prepTime} min · {meal.servings} servings
                  </Text>
                </View>
                <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Create new */}
        <TouchableOpacity style={styles.createNewBtn} onPress={onCreateNew} activeOpacity={0.7}>
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={styles.createNewText}>Create a custom meal</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── ADD MEAL MODAL ──────────────────────────────────────────

function AddMealModal({
  defaultCategory,
  onClose,
  onSave,
}: {
  defaultCategory: MealSlot;
  onClose: () => void;
  onSave: (meal: Omit<Meal, 'id'>) => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MealSlot>(defaultCategory);
  const [emoji, setEmoji] = useState('\u{1F37D}\u{FE0F}');
  const [prepTime, setPrepTime] = useState('15');
  const [servings, setServings] = useState('2');

  const handleSave = () => {
    if (!name.trim()) return;
    Keyboard.dismiss();
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
    <SafeAreaView style={styles.modalSafe} edges={['top']}>
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose} style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>New Meal</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!name.trim()}
          style={[styles.saveBtn, !name.trim() && { opacity: 0.4 }]}
          activeOpacity={0.7}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
        <Input
          label="What's the meal?"
          placeholder="e.g. Chicken Alfredo"
          value={name}
          onChangeText={setName}
        />

        {/* Emoji picker */}
        <Text style={styles.fieldLabel}>Pick an icon</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
          <View style={styles.emojiRow}>
            {EMOJI_OPTIONS.map((e) => (
              <TouchableOpacity
                key={e}
                style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
                onPress={() => setEmoji(e)}
                activeOpacity={0.7}
              >
                <Text style={styles.emojiBtnText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Category */}
        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.catRow}>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map((cat) => {
            const config = SLOT_CONFIG[cat];
            const active = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, active && { backgroundColor: config.color, borderColor: config.color }]}
                onPress={() => setCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 14 }}>{config.emoji}</Text>
                <Text style={[styles.catChipText, active && { color: '#fff' }]}>{config.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Prep & Servings */}
        <View style={styles.rowInputs}>
          <View style={{ flex: 1 }}>
            <Input
              label="Prep time (min)"
              placeholder="15"
              value={prepTime}
              onChangeText={setPrepTime}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Servings"
              placeholder="2"
              value={servings}
              onChangeText={setServings}
              keyboardType="number-pad"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── SHOPPING LIST PREVIEW ───────────────────────────────────

function ShoppingListPreview({ onClose }: { onClose: () => void }) {
  const { generateShoppingList, weekPlan, getMealById } = useMealStore();
  const { addList, addItem } = useListStore();
  const userId = useAuthStore.getState().user?.id ?? '';
  const [creating, setCreating] = useState(false);
  const { showAlert } = useAlert();

  const ingredients = generateShoppingList();

  // Group ingredients by category
  const grouped = ingredients.reduce<Record<string, MealIngredient[]>>((acc, ing) => {
    const cat = ing.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ing);
    return acc;
  }, {});

  // Count meals planned
  const mealCount = weekPlan.reduce((count, day) => {
    return count + (day.breakfast ? 1 : 0) + (day.lunch ? 1 : 0) + (day.dinner ? 1 : 0) + day.snacks.length;
  }, 0);

  const handleCreateList = async () => {
    if (ingredients.length === 0) return;
    setCreating(true);
    try {
      const listName = `Meal Plan - ${format(new Date(), 'MMM d')}`;
      await addList({
        name: listName,
        shared: true,
        createdBy: userId,
      });
      // Find the newly created list
      const lists = useListStore.getState().lists;
      const newList = lists.find((l) => l.name === listName);
      if (newList) {
        for (const ing of ingredients) {
          await addItem(newList.id, {
            name: `${ing.name}${ing.quantity ? ` (${ing.quantity} ${ing.unit})` : ''}`,
            quantity: 1,
            unit: ing.unit,
            checked: false,
            category: ing.category,
            addedBy: userId,
          });
        }
      }
      showAlert('Shopping List Created', `Added ${ingredients.length} items to "${listName}".`);
      onClose();
    } catch {
      showAlert('Error', 'Could not create shopping list.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.pickerSafe} edges={['top']}>
      <View style={styles.pickerHeader}>
        <TouchableOpacity onPress={onClose} style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.pickerTitle}>Shopping List</Text>
        <TouchableOpacity
          onPress={handleCreateList}
          disabled={ingredients.length === 0 || creating}
          style={[styles.saveBtn, (ingredients.length === 0 || creating) && { opacity: 0.4 }]}
          activeOpacity={0.7}
        >
          <Text style={styles.saveBtnText}>{creating ? 'Creating...' : 'Create'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.pickerContent} showsVerticalScrollIndicator={false}>
        {/* Summary */}
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
                    <Text style={styles.shoppingItemQty}>
                      {ing.quantity} {ing.unit}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ))
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── STYLES ────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...typography.headline, color: colors.text },
  headerSub: { ...typography.caption1, color: colors.textSecondary, marginTop: 1 },
  headerAddBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 'auto',
  },

  // Week selector
  weekRow: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  dayPill: {
    width: 52, height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    ...shadows.sm,
  },
  dayPillActive: {
    backgroundColor: colors.primary,
  },
  dayLabel: { ...typography.caption2, color: colors.textTertiary },
  dayLabelActive: { color: 'rgba(255,255,255,0.7)' },
  dayNum: { ...typography.headline, color: colors.text },
  dayNumActive: { color: '#FFFFFF' },
  todayDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: colors.primary,
  },
  todayDotActive: { backgroundColor: '#FFFFFF' },

  // Slots
  slotsContainer: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  slotIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  slotEmoji: { fontSize: 24 },
  slotContent: { flex: 1 },
  slotLabel: { ...typography.caption1, color: colors.textTertiary, marginBottom: 2 },
  slotMealName: { ...typography.headline, color: colors.text },
  slotEmpty: { ...typography.body, color: colors.textTertiary, fontStyle: 'italic' },

  // Saved meals section
  savedSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing['2xl'],
  },
  savedTitle: { ...typography.headline, color: colors.text, marginBottom: 2 },
  savedHint: { ...typography.caption1, color: colors.textTertiary, marginBottom: spacing.md },
  savedRow: { gap: spacing.sm },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    ...shadows.sm,
  },
  savedChipEmoji: { fontSize: 18 },
  savedChipName: { ...typography.subhead, color: colors.text, maxWidth: 100 },

  // Picker
  pickerSafe: { flex: 1, backgroundColor: colors.background },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  pickerTitle: { ...typography.headline, color: colors.text },
  pickerContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  pickerSectionTitle: { ...typography.headline, color: colors.text, marginBottom: 2 },
  pickerSectionHint: { ...typography.caption1, color: colors.textTertiary, marginBottom: spacing.md },
  quickGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
  },
  quickCard: {
    width: '30%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: 6,
    ...shadows.sm,
  },
  quickEmoji: { fontSize: 28 },
  quickName: { ...typography.caption1, color: colors.text, textAlign: 'center' },

  // Saved meal rows in picker
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

  // Create new
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
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  modalTitle: { ...typography.headline, color: colors.text },
  saveBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, borderRadius: radius.full,
  },
  saveBtnText: { ...typography.subhead, color: '#FFFFFF', fontWeight: '600' },
  modalContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  fieldLabel: { ...typography.subhead, color: colors.textSecondary, marginBottom: spacing.sm },
  emojiRow: { flexDirection: 'row', gap: spacing.sm },
  emojiBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  emojiBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  emojiBtnText: { fontSize: 22 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
  },
  catChipText: { ...typography.subhead, color: colors.textSecondary },
  rowInputs: { flexDirection: 'row', gap: spacing.md },

  // Shopping list FAB
  shoppingFab: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
    zIndex: 100,
  },

  // Shopping list preview
  shoppingSummary: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  shoppingSumItem: {
    flex: 1,
    alignItems: 'center',
  },
  shoppingSumNumber: {
    ...typography.title2,
    color: colors.text,
  },
  shoppingSumLabel: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  shoppingSumDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  shoppingEmpty: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.sm,
  },
  shoppingEmptyTitle: { ...typography.headline, color: colors.text },
  shoppingEmptyDesc: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  shoppingCategory: {
    marginBottom: spacing.lg,
  },
  shoppingCategoryTitle: {
    ...typography.subhead,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  shoppingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 4,
    gap: spacing.sm,
  },
  shoppingItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  shoppingItemName: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  shoppingItemQty: {
    ...typography.caption1,
    color: colors.textSecondary,
  },
});
