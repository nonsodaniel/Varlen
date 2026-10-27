import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Meal, DayMealPlan, MealIngredient } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { getResolvedHouseholdId, ensureHouseholdId } from './householdStore';

interface MealStoreState {
  meals: Meal[];
  weekPlan: DayMealPlan[];
  isLoading: boolean;
  fetchMeals: () => Promise<void>;
  fetchMealPlans: (startDate?: string, endDate?: string) => Promise<void>;
  addMeal: (meal: Omit<Meal, 'id'>) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;
  addMealToSlot: (date: string, slot: 'breakfast' | 'lunch' | 'dinner' | 'snack', mealId: string) => Promise<void>;
  removeMealFromSlot: (date: string, slot: 'breakfast' | 'lunch' | 'dinner' | 'snack', mealId: string) => Promise<void>;
  getMealById: (id: string) => Meal | undefined;
  generateShoppingList: () => MealIngredient[];
}

function mapMeal(m: any): Meal {
  return {
    id: m.id,
    name: m.title ?? m.name ?? '',
    category: (m.type ?? 'dinner').toLowerCase() as Meal['category'],
    ingredients: Array.isArray(m.ingredients) ? m.ingredients : [],
    prepTime: m.prepTime ?? 0,
    servings: m.servings ?? 2,
    emoji: m.emoji ?? '',
    tags: Array.isArray(m.tags) ? m.tags : [],
  };
}

const slotToMealType: Record<string, string> = {
  breakfast: 'BREAKFAST',
  lunch: 'LUNCH',
  dinner: 'DINNER',
  snack: 'SNACK',
};

function groupPlansIntoDays(plans: any[]): DayMealPlan[] {
  const dayMap = new Map<string, DayMealPlan>();

  for (const p of plans) {
    const dateStr = (p.date ?? '').split('T')[0];
    if (!dayMap.has(dateStr)) {
      dayMap.set(dateStr, { date: dateStr, breakfast: [], lunch: [], dinner: [], snacks: [] });
    }
    const day = dayMap.get(dateStr)!;
    const type = (p.mealType ?? '').toLowerCase();
    // Prefer mealId from the plan entry; fall back to nested meal.id
    const mealRef: string | undefined = p.mealId ?? p.meal?.id ?? undefined;
    if (!mealRef) continue;

    if (type === 'breakfast' && !day.breakfast.includes(mealRef)) day.breakfast.push(mealRef);
    else if (type === 'lunch' && !day.lunch.includes(mealRef)) day.lunch.push(mealRef);
    else if (type === 'dinner' && !day.dinner.includes(mealRef)) day.dinner.push(mealRef);
    else if (type === 'snack' && !day.snacks.includes(mealRef)) day.snacks.push(mealRef);
  }

  return Array.from(dayMap.values());
}

let _lastFetchedAt = 0;

export const useMealStore = create<MealStoreState>()(
  persist(
    (set, get) => ({
  meals: [],
  weekPlan: [],
  isLoading: false,

  fetchMeals: async () => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const hasData = get().meals.length > 0;
    if (hasData && Date.now() - _lastFetchedAt < 30000) return;
    set({ isLoading: !hasData });
    try {
      const res = await apiGet<any>(`/households/${hid}/meals`);
      const raw = res.data ?? res;
      _lastFetchedAt = Date.now();
      set({ meals: (Array.isArray(raw) ? raw : []).map(mapMeal), isLoading: false });
    } catch (err) {
      console.warn('[mealStore] fetchMeals failed:', err);
      set({ isLoading: false });
    }
  },

  fetchMealPlans: async (startDate, endDate) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    try {
      let url = `/households/${hid}/meals/plans/week`;
      const params: string[] = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length) url += `?${params.join('&')}`;

      const res = await apiGet<any>(url);
      const raw = res.data ?? res;
      set({ weekPlan: groupPlansIntoDays(Array.isArray(raw) ? raw : []) });
    } catch (err) { console.warn('[mealStore] operation failed:', err); }
  },

  addMeal: async (meal) => {
    const hid = await ensureHouseholdId();
    if (!hid) return;
    const tempId = `temp-${Date.now()}`;
    set((s) => ({ meals: [...s.meals, { ...meal, id: tempId }] }));
    try {
      const body: Record<string, unknown> = {
        title: meal.name,
        type: slotToMealType[meal.category] ?? 'DINNER',
        ingredients: meal.ingredients,
        prepTime: meal.prepTime,
        servings: meal.servings,
        emoji: meal.emoji,
        tags: meal.tags,
      };
      const res = await apiPost<any>(`/households/${hid}/meals`, body);
      const created = res?.data ?? res;
      if (created?.id) {
        set((s) => ({ meals: s.meals.map((m) => m.id === tempId ? mapMeal(created) : m) }));
      }
    } catch (err) {
      console.warn('[mealStore] addMeal failed:', err);
      set((s) => ({ meals: s.meals.filter((m) => m.id !== tempId) }));
    }
  },

  removeMeal: async (id) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().meals;
    set((s) => ({ meals: s.meals.filter((m) => m.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/meals/${id}`);
    } catch (err) {
      console.warn('[mealStore] removeMeal failed:', err);
      set({ meals: prev });
    }
  },

  addMealToSlot: async (date, slot, mealId) => {
    const hid = await ensureHouseholdId();
    if (!hid) return;
    const prev = get().weekPlan;

    // Optimistic update
    set((s) => {
      const existing = s.weekPlan.find((d) => d.date === date);
      const key = slot === 'snack' ? 'snacks' : slot;
      if (existing) {
        if (existing[key].includes(mealId)) return s; // already there
        return {
          weekPlan: s.weekPlan.map((d) =>
            d.date === date ? { ...d, [key]: [...d[key], mealId] } : d,
          ),
        };
      }
      const newDay: DayMealPlan = { date, breakfast: [], lunch: [], dinner: [], snacks: [] };
      newDay[key as keyof DayMealPlan] = [mealId] as any;
      return { weekPlan: [...s.weekPlan, newDay] };
    });

    try {
      await apiPost(`/households/${hid}/meals/plans`, {
        date,
        mealType: slotToMealType[slot] ?? 'DINNER',
        mealId,
      });
    } catch (err) {
      console.warn('[mealStore] addMealToSlot failed:', err);
      set({ weekPlan: prev });
    }
  },

  removeMealFromSlot: async (date, slot, mealId) => {
    const hid = await ensureHouseholdId();
    if (!hid) return;
    const prev = get().weekPlan;
    const key = slot === 'snack' ? 'snacks' : slot;

    // Optimistic update
    set((s) => ({
      weekPlan: s.weekPlan.map((d) =>
        d.date === date
          ? { ...d, [key]: (d[key] as string[]).filter((id) => id !== mealId) }
          : d,
      ),
    }));

    try {
      await apiDelete(
        `/households/${hid}/meals/plans/entry?date=${encodeURIComponent(date)}&mealType=${slotToMealType[slot] ?? 'DINNER'}&mealId=${mealId}`,
      );
    } catch (err) {
      console.warn('[mealStore] removeMealFromSlot failed:', err);
      set({ weekPlan: prev });
    }
  },

  getMealById: (id) => get().meals.find((m) => m.id === id),

  generateShoppingList: () => {
    const { weekPlan, meals } = get();
    const ingredientMap = new Map<string, MealIngredient>();

    weekPlan.forEach((day) => {
      const mealIds = [
        ...(day.breakfast || []),
        ...(day.lunch || []),
        ...(day.dinner || []),
        ...(day.snacks || []),
      ];
      mealIds.forEach((mealId) => {
        const meal = meals.find((m) => m.id === mealId);
        if (meal && Array.isArray(meal.ingredients)) {
          meal.ingredients.forEach((ing) => {
            const key = ing.name.toLowerCase();
            if (!ingredientMap.has(key)) {
              ingredientMap.set(key, { ...ing });
            }
          });
        }
      });
    });

    return Array.from(ingredientMap.values());
  },
    }),
    {
      name: 'sivena-meals',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ meals: state.meals, weekPlan: state.weekPlan }),
    },
  ),
);
