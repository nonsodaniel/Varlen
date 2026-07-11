import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Meal, DayMealPlan, MealIngredient } from '../types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { useHouseholdStore, getResolvedHouseholdId } from './householdStore';

interface MealStoreState {
  meals: Meal[];
  weekPlan: DayMealPlan[];
  isLoading: boolean;
  fetchMeals: () => Promise<void>;
  fetchMealPlans: (startDate?: string, endDate?: string) => Promise<void>;
  addMeal: (meal: Omit<Meal, 'id'>) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;
  setMealForDay: (date: string, slot: 'breakfast' | 'lunch' | 'dinner', mealId: string | undefined) => Promise<void>;
  addSnack: (date: string, mealId: string) => Promise<void>;
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
      dayMap.set(dateStr, { date: dateStr, snacks: [] });
    }
    const day = dayMap.get(dateStr)!;
    const type = (p.mealType ?? '').toLowerCase();
    const mealRef = p.mealId ?? undefined;

    if (type === 'breakfast') day.breakfast = mealRef;
    else if (type === 'lunch') day.lunch = mealRef;
    else if (type === 'dinner') day.dinner = mealRef;
    else if (type === 'snack' && mealRef) day.snacks.push(mealRef);
  }

  return Array.from(dayMap.values());
}

export const useMealStore = create<MealStoreState>()(
  persist(
    (set, get) => ({
  meals: [],
  weekPlan: [],
  isLoading: false,

  fetchMeals: async () => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    set({ isLoading: true });
    try {
      const res = await apiGet<any>(`/households/${hid}/meals`);
      const raw = res.data ?? res;
      set({ meals: (Array.isArray(raw) ? raw : []).map(mapMeal), isLoading: false });
    } catch {
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
    } catch {}
  },

  addMeal: async (meal) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
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
      const created = res.data ?? res;
      set((s) => ({ meals: [...s.meals, mapMeal(created)] }));
    } catch {}
  },

  removeMeal: async (id) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().meals;
    set((s) => ({ meals: s.meals.filter((m) => m.id !== id) }));
    try {
      await apiDelete(`/households/${hid}/meals/${id}`);
    } catch {
      set({ meals: prev });
    }
  },

  setMealForDay: async (date, slot, mealId) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().weekPlan;

    set((s) => {
      const existing = s.weekPlan.find((d) => d.date === date);
      if (existing) {
        return {
          weekPlan: s.weekPlan.map((d) =>
            d.date === date ? { ...d, [slot]: mealId } : d,
          ),
        };
      }
      return {
        weekPlan: [...s.weekPlan, { date, [slot]: mealId, snacks: [] } as DayMealPlan],
      };
    });

    try {
      await apiPost(`/households/${hid}/meals/plans`, {
        date,
        mealType: slotToMealType[slot] ?? 'DINNER',
        mealId: mealId ?? null,
      });
    } catch {
      set({ weekPlan: prev });
    }
  },

  addSnack: async (date, mealId) => {
    const hid = getResolvedHouseholdId();
    if (!hid) return;
    const prev = get().weekPlan;

    set((s) => ({
      weekPlan: s.weekPlan.map((d) =>
        d.date === date ? { ...d, snacks: [...d.snacks, mealId] } : d,
      ),
    }));

    try {
      await apiPost(`/households/${hid}/meals/plans`, {
        date,
        mealType: 'SNACK',
        mealId,
      });
    } catch {
      set({ weekPlan: prev });
    }
  },

  getMealById: (id) => get().meals.find((m) => m.id === id),

  generateShoppingList: () => {
    const { weekPlan, meals } = get();
    const ingredientMap = new Map<string, MealIngredient>();

    weekPlan.forEach((day) => {
      const mealIds = [day.breakfast, day.lunch, day.dinner, ...day.snacks].filter(Boolean) as string[];
      mealIds.forEach((mealId) => {
        const meal = meals.find((m) => m.id === mealId);
        if (meal) {
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
