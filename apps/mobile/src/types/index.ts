export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'owner' | 'partner' | 'child' | 'family' | 'friend';
  color?: string;
}

export type LifeMode = 'single' | 'couple' | 'family' | 'parenting';

export interface Child {
  id: string;
  name: string;
  dateOfBirth: string;
  avatarUrl?: string;
  color: string;
  schoolName?: string;
  allergies?: string[];
  bedtime?: string;
  notes?: string;
}

export interface DateIdea {
  id: string;
  title: string;
  category: 'romantic' | 'adventure' | 'chill' | 'foodie';
  estimatedCost?: number;
  location?: string;
  tried: boolean;
  rating?: number;
}

export interface WellnessEntry {
  id: string;
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  sleep: number;
  water: number;
  exercise: boolean;
  note?: string;
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  type: 'tip' | 'achievement' | 'reminder';
  icon: string;
  date: string;
}

export interface Household {
  id: string;
  name: string;
  members: User[];
  createdAt: string;
  mode: LifeMode;
  children?: Child[];
  anniversary?: string;
  togetherSince?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  color: string;
  location?: string;
  createdBy: string;
  shared: boolean;
  recurring?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface Routine {
  id: string;
  title: string;
  time: string; // HH:mm
  days: number[]; // 0-6, Sunday = 0
  assignedTo: string;
  category: 'morning' | 'evening' | 'exercise' | 'meal' | 'custom';
  enabled: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  createdBy: string;
  shared: boolean;
  category?: string;
  recurring?: 'daily' | 'weekly' | 'monthly';
  isChore?: boolean;
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingItem[];
  shared: boolean;
  createdBy: string;
  updatedAt: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  checked: boolean;
  category?: string;
  addedBy: string;
}

export type ExpenseCategory =
  | 'groceries' | 'dining' | 'utilities' | 'rent'
  | 'transport' | 'entertainment' | 'health' | 'other';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  paidBy: string;
  splitBetween: string[];
  category: ExpenseCategory;
  date: string;
  settled: boolean;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  cycle: 'monthly' | 'yearly';
  category: ExpenseCategory;
  nextBillingDate: string;
  shared: boolean;
}

export interface Memory {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: 'milestone' | 'note' | 'photo' | 'document';
  createdBy: string;
  shared: boolean;
  emoji?: string;
  imageUrl?: string;
}

export interface Budget {
  id: string;
  category: ExpenseCategory;
  limit: number;
  spent: number;
  period: 'monthly';
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  color: string;
  shared: boolean;
}

export interface TimelineEntry {
  id: string;
  title: string;
  description?: string;
  emoji: string;
  date: string;
  category: 'milestone' | 'achievement' | 'event' | 'memory';
  createdBy: string;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  createdAt: string;
  closesAt?: string;
  status: 'active' | 'closed';
}

export interface PollOption {
  id: string;
  label: string;
  emoji?: string;
  votes: string[]; // user IDs
}

export interface ActivityFeedItem {
  id: string;
  userId: string;
  action: string;
  detail: string;
  timestamp: string;
  icon: string;
  color: string;
}

export interface BabyLog {
  id: string;
  childId: string;
  type: 'feed' | 'sleep' | 'diaper' | 'milestone';
  timestamp: string;
  duration?: number; // minutes
  note?: string;
}

export interface Countdown {
  id: string;
  title: string;
  date: string;
  emoji: string;
  color: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: 'mother' | 'father' | 'sister' | 'brother' | 'grandmother' | 'grandfather' | 'friend';
  color: string;
  avatarUrl?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  type: 'reminder' | 'activity' | 'chore' | 'event' | 'system';
  icon?: string;
  resourceType?: string;
  resourceId?: string;
}

export interface Goal {
  id: string;
  title: string;
  progress: number; // 0-100
  target: number;
  unit: string;
  deadline: string;
  color: string;
  createdBy: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  mood: number; // 1-5
  gratitude: string;
  note: string;
  createdBy: string;
}

// ── Meal Planning ──

export interface MealIngredient {
  name: string;
  quantity: string;
  unit: string;
  category: string;
}

export interface Meal {
  id: string;
  name: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  ingredients: MealIngredient[];
  prepTime: number; // minutes
  servings: number;
  emoji: string;
  tags: string[];
}

export interface DayMealPlan {
  date: string; // yyyy-MM-dd
  breakfast?: string; // meal id
  lunch?: string;
  dinner?: string;
  snacks: string[];
}

// ── Documents Vault ──

export type DocumentCategory =
  | 'warranty' | 'insurance' | 'medical' | 'school'
  | 'legal' | 'travel' | 'financial' | 'other';

export interface FamilyDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  description?: string;
  expiryDate?: string;
  addedBy: string;
  addedAt: string;
  notes?: string;
  emoji: string;
}

// ── Habits / Streaks ──

export interface Habit {
  id: string;
  title: string;
  emoji: string;
  frequency: 'daily' | 'weekly';
  completedDates: string[]; // yyyy-MM-dd
  createdBy: string;
  color: string;
  streak: number;
  bestStreak: number;
}
