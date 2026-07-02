import { create } from 'zustand';
import type { Goal } from '../types';

const mockGoals: Goal[] = [
  {
    id: 'goal-1',
    title: 'Read 12 books',
    progress: 58,
    target: 12,
    unit: 'books',
    deadline: '2026-12-31',
    color: '#3B82F6',
    createdBy: 'user-1',
  },
  {
    id: 'goal-2',
    title: 'Run 500 miles',
    progress: 72,
    target: 500,
    unit: 'miles',
    deadline: '2026-12-31',
    color: '#10B981',
    createdBy: 'user-1',
  },
  {
    id: 'goal-3',
    title: 'Save $10,000',
    progress: 45,
    target: 10000,
    unit: 'dollars',
    deadline: '2026-12-31',
    color: '#F59E0B',
    createdBy: 'user-1',
  },
  {
    id: 'goal-4',
    title: 'Learn guitar',
    progress: 30,
    target: 100,
    unit: 'lessons',
    deadline: '2027-06-30',
    color: '#8B5CF6',
    createdBy: 'user-1',
  },
  {
    id: 'goal-5',
    title: 'Cook 50 new recipes',
    progress: 60,
    target: 50,
    unit: 'recipes',
    deadline: '2026-09-30',
    color: '#EC4899',
    createdBy: 'user-1',
  },
];

interface GoalState {
  goals: Goal[];
  addGoal: (goal: Goal) => void;
  updateProgress: (id: string, increment: number) => void;
}

export const useGoalStore = create<GoalState>((set) => ({
  goals: mockGoals,

  addGoal: (goal) =>
    set((state) => ({ goals: [...state.goals, goal] })),

  updateProgress: (id, increment) =>
    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === id
          ? { ...g, progress: Math.min(100, g.progress + increment) }
          : g
      ),
    })),
}));
