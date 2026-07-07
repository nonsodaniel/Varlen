import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DateCategory = 'romantic' | 'adventure' | 'chill' | 'foodie';

export interface DateIdea {
  id: string;
  title: string;
  category: DateCategory;
  estimatedCost?: number;
  location?: string;
  notes?: string;
  tried: boolean;
  createdAt: string;
}

interface DateIdeaState {
  ideas: DateIdea[];
  addIdea: (idea: Omit<DateIdea, 'id' | 'createdAt'>) => void;
  removeIdea: (id: string) => void;
  toggleTried: (id: string) => void;
  getRandomUntried: () => DateIdea | null;
}

export const useDateIdeaStore = create<DateIdeaState>()(
  persist(
    (set, get) => ({
      ideas: [],

      addIdea: (idea) => {
        const newIdea: DateIdea = {
          ...idea,
          id: `date-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ ideas: [newIdea, ...state.ideas] }));
      },

      removeIdea: (id) => {
        set((state) => ({ ideas: state.ideas.filter((i) => i.id !== id) }));
      },

      toggleTried: (id) => {
        set((state) => ({
          ideas: state.ideas.map((i) =>
            i.id === id ? { ...i, tried: !i.tried } : i
          ),
        }));
      },

      getRandomUntried: () => {
        const untried = get().ideas.filter((i) => !i.tried);
        if (untried.length === 0) return null;
        return untried[Math.floor(Math.random() * untried.length)];
      },
    }),
    {
      name: 'date-ideas-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
