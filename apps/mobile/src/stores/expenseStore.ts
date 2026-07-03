import { create } from 'zustand';
import { Expense } from '../types';
import { mockExpenses, currentUser } from '../data/mock';

interface ExpenseState {
  expenses: Expense[];
  addExpense: (expense: Expense) => void;
  settleExpense: (id: string) => void;
  deleteExpense: (id: string) => void;
  getBalance: () => { userOwes: number; partnerOwes: number; net: number };
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: mockExpenses,

  addExpense: (expense) =>
    set((state) => ({ expenses: [...state.expenses, expense] })),

  settleExpense: (id) =>
    set((state) => ({
      expenses: state.expenses.map((e) =>
        e.id === id ? { ...e, settled: true } : e
      ),
    })),

  deleteExpense: (id) =>
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== id),
    })),

  getBalance: () => {
    const unsettled = get().expenses.filter((e) => !e.settled);
    let userPaid = 0;
    let partnerPaid = 0;

    unsettled.forEach((e) => {
      const splitAmount = Math.round((e.amount / e.splitBetween.length) * 100) / 100;
      if (e.paidBy === currentUser.id) {
        userPaid += e.amount - splitAmount;
      } else {
        partnerPaid += e.amount - splitAmount;
      }
    });

    return {
      userOwes: Math.round(partnerPaid * 100) / 100,
      partnerOwes: Math.round(userPaid * 100) / 100,
      net: Math.round((userPaid - partnerPaid) * 100) / 100,
    };
  },
}));
