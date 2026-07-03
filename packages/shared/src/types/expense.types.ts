import { ExpenseCategory } from '../enums/expense-category.enum';

// ---------------------------------------------------------------------------
// Expense domain types
// ---------------------------------------------------------------------------

/** How an expense is split among household members. */
export interface IExpenseSplit {
  /** User ID of the member. */
  userId: string;
  /** Amount this member owes (in the expense's currency). */
  amount: number;
}

/** A recorded expense within a household. */
export interface IExpense {
  /** Unique identifier. */
  id: string;
  /** Household this expense belongs to. */
  householdId: string;
  /** Short title / description of the expense. */
  title: string;
  /** Total amount (in the specified currency). */
  amount: number;
  /** ISO 4217 currency code (e.g. "USD", "EUR"). */
  currency: string;
  /** User ID of the member who paid. */
  paidBy: string;
  /** Expense category. */
  category: ExpenseCategory;
  /** ISO-8601 date string when the expense occurred. */
  date: string;
  /** Whether the expense has been fully settled. */
  settled: boolean;
  /** How the expense is divided among members. */
  splits: IExpenseSplit[];
}

/** Payload for creating a new expense. */
export interface ICreateExpense {
  /** Household this expense belongs to. */
  householdId: string;
  /** Short title. */
  title: string;
  /** Total amount. */
  amount: number;
  /** ISO 4217 currency code. */
  currency: string;
  /** User ID of the member who paid. */
  paidBy: string;
  /** Expense category. */
  category: ExpenseCategory;
  /** ISO-8601 date string. */
  date: string;
  /** How the expense is divided. */
  splits: IExpenseSplit[];
}

/** Aggregated balance for a single household member. */
export interface IBalance {
  /** User ID. */
  userId: string;
  /** Display name of the user. */
  name: string;
  /** Net balance (positive = owed money, negative = owes money). */
  netBalance: number;
}

/** Query parameters for fetching expenses. */
export interface IQueryExpenses {
  /** Filter by category. */
  category?: ExpenseCategory;
  /** Filter by payer user ID. */
  paidBy?: string;
  /** Filter by settlement status. */
  settled?: boolean;
  /** ISO-8601 date-time lower bound. */
  startDate?: string;
  /** ISO-8601 date-time upper bound. */
  endDate?: string;
}
