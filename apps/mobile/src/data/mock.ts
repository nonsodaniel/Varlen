import { User, CalendarEvent, Task, ShoppingList, Expense, Household, Routine, Subscription, Memory, Budget, Child, DateIdea, WellnessEntry, Insight, TimelineEntry, Poll, ActivityFeedItem, BabyLog, Countdown, FamilyMember } from '../types';
import { format, addDays, subDays, differenceInDays } from 'date-fns';

const today = new Date();
const todayStr = format(today, 'yyyy-MM-dd');

export const currentUser: User = {
  id: 'user-1', name: 'Alex', email: 'alex@example.com',
  avatarUrl: undefined, role: 'owner', color: '#3B82F6',
};

export const partner: User = {
  id: 'user-2', name: 'Jordan', email: 'jordan@example.com',
  avatarUrl: undefined, role: 'partner', color: '#10B981',
};

export const mockChildren: Child[] = [
  {
    id: 'child-1',
    name: 'Emma',
    dateOfBirth: '2019-03-15',
    color: '#EC4899',
    schoolName: 'Riverside Elementary',
    bedtime: '8:30 PM',
  },
  {
    id: 'child-2',
    name: 'Liam',
    dateOfBirth: '2023-05-22',
    color: '#F59E0B',
    notes: 'Loves dinosaurs',
  },
];

export const household: Household = {
  id: 'household-1', name: 'Our Home',
  members: [currentUser, partner],
  createdAt: '2024-01-15', mode: 'couple',
  togetherSince: '2023-02-14',
  anniversary: '2023-02-14',
  children: mockChildren,
};

export const mockEvents: CalendarEvent[] = [
  {
    id: 'event-1', title: 'Grocery run',
    description: 'Weekly grocery shopping at Whole Foods',
    startDate: `${todayStr}T10:00:00`, endDate: `${todayStr}T11:30:00`,
    allDay: false, color: '#10B981', location: 'Whole Foods Market',
    createdBy: 'user-1', shared: true, recurring: 'weekly',
  },
  {
    id: 'event-2', title: 'Date night',
    description: 'Dinner reservation',
    startDate: `${format(addDays(today, 1), 'yyyy-MM-dd')}T19:00:00`,
    endDate: `${format(addDays(today, 1), 'yyyy-MM-dd')}T21:00:00`,
    allDay: false, color: '#EF4444', location: 'The Italian Place',
    createdBy: 'user-2', shared: true,
  },
  {
    id: 'event-3', title: 'Dentist appointment',
    startDate: `${format(addDays(today, 2), 'yyyy-MM-dd')}T14:00:00`,
    endDate: `${format(addDays(today, 2), 'yyyy-MM-dd')}T15:00:00`,
    allDay: false, color: '#6B7280', createdBy: 'user-1', shared: false,
  },
  {
    id: 'event-4', title: 'Weekend hike',
    description: 'Trail at Mount Tam',
    startDate: `${format(addDays(today, 4), 'yyyy-MM-dd')}T08:00:00`,
    endDate: `${format(addDays(today, 4), 'yyyy-MM-dd')}T12:00:00`,
    allDay: false, color: '#10B981', location: 'Mount Tamalpais',
    createdBy: 'user-1', shared: true,
  },
  {
    id: 'event-5', title: 'Rent due',
    startDate: `${format(addDays(today, 5), 'yyyy-MM-dd')}T00:00:00`,
    endDate: `${format(addDays(today, 5), 'yyyy-MM-dd')}T23:59:59`,
    allDay: true, color: '#F59E0B', createdBy: 'user-1', shared: true,
    recurring: 'monthly',
  },
  {
    id: 'event-6', title: 'Yoga class',
    startDate: `${todayStr}T07:00:00`, endDate: `${todayStr}T08:00:00`,
    allDay: false, color: '#8B5CF6', location: 'Studio Zen',
    createdBy: 'user-2', shared: false, recurring: 'weekly',
  },
  { id: 'event-7', title: "Mom's book club", startDate: `${todayStr}T14:00:00`, endDate: `${todayStr}T16:00:00`, allDay: false, color: '#EC4899', location: 'Community Center', createdBy: 'fam-1', shared: false },
  { id: 'event-8', title: "Dad's golf", startDate: `${todayStr}T08:00:00`, endDate: `${todayStr}T11:00:00`, allDay: false, color: '#8B5CF6', location: 'Pine Hills Golf', createdBy: 'fam-2', shared: false },
  { id: 'event-9', title: "Sarah's study group", startDate: `${todayStr}T16:00:00`, endDate: `${todayStr}T18:00:00`, allDay: false, color: '#F59E0B', location: 'Library', createdBy: 'fam-3', shared: false },
  { id: 'event-10', title: "Emma's swimming class", startDate: `${todayStr}T15:00:00`, endDate: `${todayStr}T16:30:00`, allDay: false, color: '#EC4899', createdBy: 'child-1', shared: true },
  { id: 'event-11', title: 'Family dinner', startDate: `${format(addDays(today, 1), 'yyyy-MM-dd')}T18:30:00`, endDate: `${format(addDays(today, 1), 'yyyy-MM-dd')}T20:00:00`, allDay: false, color: '#10B981', location: 'Home', createdBy: 'user-1', shared: true },
  { id: 'event-12', title: "Liam's pediatrician", startDate: `${format(addDays(today, 1), 'yyyy-MM-dd')}T10:00:00`, endDate: `${format(addDays(today, 1), 'yyyy-MM-dd')}T11:00:00`, allDay: false, color: '#F59E0B', createdBy: 'user-2', shared: true },
];

export const mockRoutines: Routine[] = [
  { id: 'routine-1', title: 'Morning workout', time: '06:30', days: [1,2,3,4,5], assignedTo: 'user-1', category: 'exercise', enabled: true },
  { id: 'routine-2', title: 'Take vitamins', time: '08:00', days: [0,1,2,3,4,5,6], assignedTo: 'user-1', category: 'morning', enabled: true },
  { id: 'routine-3', title: 'Walk the dog', time: '07:00', days: [0,1,2,3,4,5,6], assignedTo: 'user-2', category: 'morning', enabled: true },
  { id: 'routine-4', title: 'Read before bed', time: '22:00', days: [0,1,2,3,4,5,6], assignedTo: 'user-1', category: 'evening', enabled: true },
  { id: 'routine-5', title: 'Meal prep Sunday', time: '11:00', days: [0], assignedTo: 'user-2', category: 'meal', enabled: true },
];

export const mockTasks: Task[] = [
  { id: 'task-1', title: 'Pick up dry cleaning', completed: false, dueDate: todayStr, priority: 'medium', assignedTo: 'user-1', createdBy: 'user-2', shared: true, category: 'errand' },
  { id: 'task-2', title: 'Call plumber about leak', description: 'Kitchen faucet has been dripping', completed: false, dueDate: todayStr, priority: 'high', assignedTo: 'user-1', createdBy: 'user-1', shared: true, category: 'household' },
  { id: 'task-3', title: 'Book flights for vacation', description: 'Check Southwest and Delta', completed: false, dueDate: format(addDays(today, 3), 'yyyy-MM-dd'), priority: 'medium', assignedTo: 'user-2', createdBy: 'user-1', shared: true, category: 'personal' },
  { id: 'task-4', title: 'Pay electricity bill', completed: true, dueDate: format(subDays(today, 1), 'yyyy-MM-dd'), priority: 'high', assignedTo: 'user-2', createdBy: 'user-2', shared: true, category: 'household' },
  { id: 'task-5', title: 'Schedule car service', completed: false, dueDate: format(addDays(today, 7), 'yyyy-MM-dd'), priority: 'low', assignedTo: 'user-1', createdBy: 'user-1', shared: false, category: 'errand' },
  { id: 'task-6', title: 'Clean out garage', completed: false, dueDate: format(addDays(today, 5), 'yyyy-MM-dd'), priority: 'low', createdBy: 'user-1', shared: true, category: 'household', isChore: true },
  { id: 'task-7', title: 'Renew gym membership', completed: false, dueDate: format(addDays(today, 2), 'yyyy-MM-dd'), priority: 'medium', assignedTo: 'user-1', createdBy: 'user-1', shared: false, category: 'personal' },
  { id: 'task-8', title: 'Take out trash', completed: false, dueDate: todayStr, priority: 'medium', assignedTo: 'user-2', createdBy: 'user-1', shared: true, category: 'household', isChore: true, recurring: 'weekly' },
  { id: 'task-9', title: 'Water plants', completed: true, dueDate: todayStr, priority: 'low', assignedTo: 'user-1', createdBy: 'user-1', shared: true, category: 'household', isChore: true, recurring: 'weekly' },
  { id: 'task-10', title: 'Emma homework — Math worksheet', completed: false, dueDate: todayStr, priority: 'high' as const, assignedTo: 'child-1', createdBy: 'user-1', shared: true, category: 'personal' },
  { id: 'task-11', title: 'Pack school lunch', completed: false, dueDate: todayStr, priority: 'medium' as const, assignedTo: 'user-1', createdBy: 'user-1', shared: true, category: 'household', isChore: true },
  { id: 'task-12', title: 'Emma — feed the dog', completed: false, dueDate: todayStr, priority: 'low' as const, assignedTo: 'child-1', createdBy: 'user-2', shared: true, category: 'household', isChore: true },
  { id: 'task-13', title: 'Liam — tummy time', completed: true, dueDate: todayStr, priority: 'medium' as const, assignedTo: 'user-2', createdBy: 'user-2', shared: true, category: 'personal' },
];

export const mockLists: ShoppingList[] = [
  {
    id: 'list-1', name: 'Weekly Groceries', shared: true, createdBy: 'user-1', updatedAt: todayStr,
    items: [
      { id: 'item-1', name: 'Avocados', quantity: 4, checked: false, category: 'Produce', addedBy: 'user-1' },
      { id: 'item-2', name: 'Oat milk', quantity: 2, unit: 'cartons', checked: false, category: 'Dairy', addedBy: 'user-2' },
      { id: 'item-3', name: 'Sourdough bread', quantity: 1, checked: true, category: 'Bakery', addedBy: 'user-1' },
      { id: 'item-4', name: 'Chicken breast', quantity: 1, unit: 'lb', checked: false, category: 'Meat', addedBy: 'user-2' },
      { id: 'item-5', name: 'Spinach', quantity: 1, unit: 'bag', checked: false, category: 'Produce', addedBy: 'user-1' },
      { id: 'item-6', name: 'Eggs', quantity: 1, unit: 'dozen', checked: true, category: 'Dairy', addedBy: 'user-1' },
      { id: 'item-7', name: 'Olive oil', quantity: 1, checked: false, category: 'Pantry', addedBy: 'user-2' },
      { id: 'item-8', name: 'Bananas', quantity: 6, checked: false, category: 'Produce', addedBy: 'user-1' },
    ],
  },
  {
    id: 'list-2', name: 'Home supplies', shared: true, createdBy: 'user-2', updatedAt: format(subDays(today, 2), 'yyyy-MM-dd'),
    items: [
      { id: 'item-9', name: 'Paper towels', quantity: 2, unit: 'rolls', checked: false, category: 'Cleaning', addedBy: 'user-2' },
      { id: 'item-10', name: 'Dish soap', quantity: 1, checked: false, category: 'Cleaning', addedBy: 'user-1' },
      { id: 'item-11', name: 'Light bulbs', quantity: 4, checked: true, category: 'Hardware', addedBy: 'user-1' },
    ],
  },
  {
    id: 'list-3', name: 'Trip packing', shared: true, createdBy: 'user-1', updatedAt: format(subDays(today, 5), 'yyyy-MM-dd'),
    items: [
      { id: 'item-12', name: 'Sunscreen', quantity: 1, checked: false, addedBy: 'user-1' },
      { id: 'item-13', name: 'Chargers', quantity: 2, checked: false, addedBy: 'user-2' },
      { id: 'item-14', name: 'Swimsuits', quantity: 2, checked: false, addedBy: 'user-1' },
    ],
  },
];

export const mockExpenses: Expense[] = [
  { id: 'expense-1', title: 'Groceries at Whole Foods', amount: 87.50, currency: 'USD', paidBy: 'user-1', splitBetween: ['user-1', 'user-2'], category: 'groceries', date: todayStr, settled: false },
  { id: 'expense-2', title: 'Dinner at Nobu', amount: 145.00, currency: 'USD', paidBy: 'user-2', splitBetween: ['user-1', 'user-2'], category: 'dining', date: format(subDays(today, 1), 'yyyy-MM-dd'), settled: false },
  { id: 'expense-3', title: 'Electric bill', amount: 120.00, currency: 'USD', paidBy: 'user-1', splitBetween: ['user-1', 'user-2'], category: 'utilities', date: format(subDays(today, 3), 'yyyy-MM-dd'), settled: true },
  { id: 'expense-4', title: 'Netflix subscription', amount: 15.49, currency: 'USD', paidBy: 'user-2', splitBetween: ['user-1', 'user-2'], category: 'entertainment', date: format(subDays(today, 5), 'yyyy-MM-dd'), settled: false },
  { id: 'expense-5', title: 'Uber to airport', amount: 42.00, currency: 'USD', paidBy: 'user-1', splitBetween: ['user-1', 'user-2'], category: 'transport', date: format(subDays(today, 7), 'yyyy-MM-dd'), settled: true },
];

export const mockSubscriptions: Subscription[] = [
  { id: 'sub-1', name: 'Netflix', amount: 15.49, currency: 'USD', cycle: 'monthly', category: 'entertainment', nextBillingDate: format(addDays(today, 12), 'yyyy-MM-dd'), shared: true },
  { id: 'sub-2', name: 'Spotify Family', amount: 16.99, currency: 'USD', cycle: 'monthly', category: 'entertainment', nextBillingDate: format(addDays(today, 8), 'yyyy-MM-dd'), shared: true },
  { id: 'sub-3', name: 'Gym membership', amount: 49.99, currency: 'USD', cycle: 'monthly', category: 'health', nextBillingDate: format(addDays(today, 3), 'yyyy-MM-dd'), shared: false },
  { id: 'sub-4', name: 'Cloud storage', amount: 2.99, currency: 'USD', cycle: 'monthly', category: 'utilities', nextBillingDate: format(addDays(today, 18), 'yyyy-MM-dd'), shared: false },
  { id: 'sub-5', name: 'Car insurance', amount: 1200.00, currency: 'USD', cycle: 'yearly', category: 'transport', nextBillingDate: format(addDays(today, 45), 'yyyy-MM-dd'), shared: true },
];

export const mockMemories: Memory[] = [
  { id: 'mem-1', title: 'Moved in together', date: '2024-01-15', type: 'milestone', createdBy: 'user-1', shared: true, emoji: '\uD83C\uDFE0' },
  { id: 'mem-2', title: 'First vacation \u2014 Cabo', date: '2024-03-22', type: 'milestone', createdBy: 'user-2', shared: true, emoji: '\u2708\uFE0F' },
  { id: 'mem-3', title: '1 year anniversary', date: '2025-02-14', type: 'milestone', createdBy: 'user-1', shared: true, emoji: '\u2764\uFE0F' },
  { id: 'mem-4', title: 'Adopted Luna', description: 'Our golden retriever puppy', date: '2024-08-10', type: 'milestone', createdBy: 'user-2', shared: true, emoji: '\uD83D\uDC36' },
  { id: 'mem-5', title: 'Got engaged', description: 'At sunset on the beach', date: '2025-06-01', type: 'milestone', createdBy: 'user-1', shared: true, emoji: '\uD83D\uDC8D' },
  { id: 'mem-6', title: "Luna's first birthday", description: 'Threw her a puppy party', date: '2025-08-10', type: 'milestone', createdBy: 'user-2', shared: true, emoji: '\uD83C\uDF82' },
  { id: 'mem-7', title: "New Year's in Paris", description: 'Watched fireworks from the Eiffel Tower', date: '2025-12-31', type: 'milestone', createdBy: 'user-1', shared: true, emoji: '\u2728' },
];

export const mockBudgets: Budget[] = [
  { id: 'budget-1', category: 'groceries', limit: 600, spent: 387, period: 'monthly' },
  { id: 'budget-2', category: 'dining', limit: 300, spent: 245, period: 'monthly' },
  { id: 'budget-3', category: 'entertainment', limit: 100, spent: 65, period: 'monthly' },
  { id: 'budget-4', category: 'transport', limit: 200, spent: 142, period: 'monthly' },
];

// --- Family Circle (extended family, available in all modes) ---

export const familyMembers: FamilyMember[] = [
  { id: 'fam-1', name: 'Mom', relationship: 'mother', color: '#EC4899' },
  { id: 'fam-2', name: 'Dad', relationship: 'father', color: '#8B5CF6' },
  { id: 'fam-3', name: 'Sarah', relationship: 'sister', color: '#F59E0B' },
];

export function getUserName(userId: string): string {
  if (userId === currentUser.id) return currentUser.name;
  if (userId === partner.id) return partner.name;
  const child = mockChildren.find(c => c.id === userId);
  if (child) return child.name;
  const fam = familyMembers.find(f => f.id === userId);
  if (fam) return fam.name;
  return 'Unknown';
}

export function getUserInitials(userId: string): string {
  return getUserName(userId).charAt(0).toUpperCase();
}

export function getUserColor(userId: string): string {
  if (userId === currentUser.id) return currentUser.color || '#3B82F6';
  if (userId === partner.id) return partner.color || '#10B981';
  const child = mockChildren.find(c => c.id === userId);
  if (child) return child.color;
  const fam = familyMembers.find(f => f.id === userId);
  if (fam) return fam.color;
  return '#6B7280';
}

// --- Date Ideas ---

export const mockDateIdeas: DateIdea[] = [
  {
    id: 'date-1',
    title: 'Sunset picnic at the park',
    category: 'romantic',
    estimatedCost: 30,
    location: 'Golden Gate Park',
    tried: true,
    rating: 5,
  },
  {
    id: 'date-2',
    title: 'Cook Thai food together',
    category: 'foodie',
    estimatedCost: 25,
    tried: true,
    rating: 4,
  },
  {
    id: 'date-3',
    title: 'Weekend road trip',
    category: 'adventure',
    estimatedCost: 150,
    tried: false,
  },
  {
    id: 'date-4',
    title: 'Wine tasting evening',
    category: 'romantic',
    estimatedCost: 60,
    location: 'Napa Valley',
    tried: false,
  },
  {
    id: 'date-5',
    title: 'Board game night',
    category: 'chill',
    estimatedCost: 0,
    tried: true,
    rating: 3,
  },
  {
    id: 'date-6',
    title: 'Morning farmers market',
    category: 'chill',
    estimatedCost: 20,
    location: 'Ferry Building',
    tried: true,
    rating: 5,
  },
];

// --- Wellness Entries (last 7 days) ---

export const mockWellness: WellnessEntry[] = [
  {
    id: 'wellness-1',
    date: todayStr,
    mood: 4 as const,
    sleep: 7.5,
    water: 8,
    exercise: true,
    note: 'Great morning run with Jordan',
  },
  {
    id: 'wellness-2',
    date: format(subDays(today, 1), 'yyyy-MM-dd'),
    mood: 3 as const,
    sleep: 6,
    water: 6,
    exercise: false,
    note: 'Stressful day at work, but date night helped',
  },
  {
    id: 'wellness-3',
    date: format(subDays(today, 2), 'yyyy-MM-dd'),
    mood: 5 as const,
    sleep: 8.5,
    water: 10,
    exercise: true,
    note: 'Best sleep in weeks',
  },
  {
    id: 'wellness-4',
    date: format(subDays(today, 3), 'yyyy-MM-dd'),
    mood: 4 as const,
    sleep: 7,
    water: 7,
    exercise: true,
  },
  {
    id: 'wellness-5',
    date: format(subDays(today, 4), 'yyyy-MM-dd'),
    mood: 3 as const,
    sleep: 5.5,
    water: 4,
    exercise: false,
    note: 'Couldn\'t sleep, Liam was up all night',
  },
  {
    id: 'wellness-6',
    date: format(subDays(today, 5), 'yyyy-MM-dd'),
    mood: 4 as const,
    sleep: 7,
    water: 9,
    exercise: true,
  },
  {
    id: 'wellness-7',
    date: format(subDays(today, 6), 'yyyy-MM-dd'),
    mood: 5 as const,
    sleep: 8,
    water: 8,
    exercise: false,
    note: 'Lazy Sunday with the family',
  },
];

// --- Insights ---

export const mockInsights: Insight[] = [
  {
    id: 'insight-1',
    title: 'Teamwork pays off',
    description: "You've completed 12 tasks together this week",
    type: 'achievement',
    icon: 'trophy',
    date: todayStr,
  },
  {
    id: 'insight-2',
    title: 'Birthday coming up',
    description: "Jordan's birthday is in 23 days",
    type: 'reminder',
    icon: 'gift',
    date: todayStr,
  },
  {
    id: 'insight-3',
    title: 'Strengthen your bond',
    description: 'Try scheduling a weekly check-in',
    type: 'tip',
    icon: 'lightbulb',
    date: todayStr,
  },
  {
    id: 'insight-4',
    title: 'Budget win',
    description: 'You spent 15% less on dining this month',
    type: 'achievement',
    icon: 'trending-down',
    date: format(subDays(today, 1), 'yyyy-MM-dd'),
  },
  {
    id: 'insight-5',
    title: 'Date night streak',
    description: 'Date night streak: 3 weeks in a row',
    type: 'achievement',
    icon: 'heart',
    date: format(subDays(today, 2), 'yyyy-MM-dd'),
  },
];

// --- Timeline ---

export const mockTimeline: TimelineEntry[] = [
  { id: 'tl-1', title: 'Moved in together', description: 'Our first home as a couple', emoji: '🏠', date: '2024-01-15', category: 'milestone', createdBy: 'user-1' },
  { id: 'tl-2', title: 'First vacation — Cabo', description: 'A week of sun and relaxation', emoji: '✈️', date: '2024-03-22', category: 'event', createdBy: 'user-2' },
  { id: 'tl-3', title: 'Got promoted', description: 'Senior engineer at last!', emoji: '🎉', date: '2024-06-01', category: 'achievement', createdBy: 'user-1' },
  { id: 'tl-4', title: 'Adopted Luna', description: 'Our golden retriever puppy', emoji: '🐶', date: '2024-08-10', category: 'milestone', createdBy: 'user-2' },
  { id: 'tl-5', title: 'Got engaged', description: 'At sunset on the beach', emoji: '💍', date: '2025-06-01', category: 'milestone', createdBy: 'user-1' },
  { id: 'tl-6', title: 'Baby first steps', description: 'Liam took his first steps!', emoji: '👶', date: '2025-04-15', category: 'milestone', createdBy: 'user-2' },
  { id: 'tl-7', title: "New Year's in Paris", description: 'Watched fireworks from the Eiffel Tower', emoji: '✨', date: '2025-12-31', category: 'event', createdBy: 'user-1' },
  { id: 'tl-8', title: 'Family road trip', description: 'Two weeks down the Pacific Coast', emoji: '🚗', date: '2026-04-10', category: 'memory', createdBy: 'user-2' },
  { id: 'tl-9', title: 'Started Valen', description: 'Building our life OS together', emoji: '🚀', date: '2026-06-01', category: 'achievement', createdBy: 'user-1' },
];

// --- Polls ---

export const mockPolls: Poll[] = [
  {
    id: 'poll-1',
    question: 'What should we eat Friday?',
    createdBy: 'user-1',
    createdAt: format(subDays(today, 1), "yyyy-MM-dd'T'HH:mm:ss"),
    closesAt: format(addDays(today, 2), "yyyy-MM-dd'T'23:59:59"),
    status: 'active',
    options: [
      { id: 'po-1', label: 'Pizza', emoji: '🍕', votes: ['user-1', 'user-2'] },
      { id: 'po-2', label: 'Burgers', emoji: '🍔', votes: [] },
      { id: 'po-3', label: 'Ramen', emoji: '🍜', votes: [] },
      { id: 'po-4', label: 'Tacos', emoji: '🌮', votes: [] },
    ],
  },
  {
    id: 'poll-2',
    question: 'Holiday destination?',
    createdBy: 'user-2',
    createdAt: format(subDays(today, 3), "yyyy-MM-dd'T'HH:mm:ss"),
    status: 'active',
    options: [
      { id: 'po-5', label: 'Italy', emoji: '🇮🇹', votes: ['user-2'] },
      { id: 'po-6', label: 'Greece', emoji: '🇬🇷', votes: ['user-1'] },
      { id: 'po-7', label: 'Spain', emoji: '🇪🇸', votes: [] },
    ],
  },
  {
    id: 'poll-3',
    question: 'Movie night pick',
    createdBy: 'user-1',
    createdAt: format(today, "yyyy-MM-dd'T'HH:mm:ss"),
    status: 'active',
    options: [
      { id: 'po-8', label: 'Action', emoji: '🎬', votes: [] },
      { id: 'po-9', label: 'Comedy', emoji: '😂', votes: [] },
      { id: 'po-10', label: 'Sci-Fi', emoji: '🔮', votes: [] },
    ],
  },
];

// --- Activity Feed ---

export const mockActivityFeed: ActivityFeedItem[] = [
  { id: 'af-1', userId: 'user-1', action: 'completed', detail: "Completed 'Pick up dry cleaning'", timestamp: format(today, "yyyy-MM-dd'T'09:30:00"), icon: 'checkmark-circle', color: '#10B981' },
  { id: 'af-2', userId: 'user-2', action: 'added_event', detail: "Added 'Date night' to calendar", timestamp: format(today, "yyyy-MM-dd'T'09:00:00"), icon: 'calendar', color: '#3B82F6' },
  { id: 'af-3', userId: 'user-1', action: 'added_item', detail: 'Added milk to shopping list', timestamp: format(today, "yyyy-MM-dd'T'08:15:00"), icon: 'cart', color: '#F59E0B' },
  { id: 'af-4', userId: 'user-2', action: 'settled', detail: 'Settled $87.50 for groceries', timestamp: format(subDays(today, 0), "yyyy-MM-dd'T'07:45:00"), icon: 'cash', color: '#10B981' },
  { id: 'af-5', userId: 'user-1', action: 'created_poll', detail: "Created poll 'Movie night pick'", timestamp: format(subDays(today, 1), "yyyy-MM-dd'T'20:00:00"), icon: 'bar-chart', color: '#8B5CF6' },
  { id: 'af-6', userId: 'user-2', action: 'logged_mood', detail: 'Logged mood: feeling great', timestamp: format(subDays(today, 1), "yyyy-MM-dd'T'08:30:00"), icon: 'happy', color: '#EC4899' },
  { id: 'af-7', userId: 'user-1', action: 'added_memory', detail: "Added memory 'Family road trip'", timestamp: format(subDays(today, 2), "yyyy-MM-dd'T'15:00:00"), icon: 'heart', color: '#EF4444' },
  { id: 'af-8', userId: 'user-2', action: 'completed', detail: "Completed 'Pay electricity bill'", timestamp: format(subDays(today, 2), "yyyy-MM-dd'T'10:00:00"), icon: 'checkmark-circle', color: '#10B981' },
];

// --- Baby Logs ---

export const mockBabyLogs: BabyLog[] = [
  { id: 'bl-1', childId: 'child-2', type: 'feed', timestamp: format(today, "yyyy-MM-dd'T'07:00:00"), duration: 20, note: 'Morning bottle — 6oz' },
  { id: 'bl-2', childId: 'child-2', type: 'diaper', timestamp: format(today, "yyyy-MM-dd'T'07:30:00"), note: 'Wet diaper' },
  { id: 'bl-3', childId: 'child-2', type: 'sleep', timestamp: format(today, "yyyy-MM-dd'T'09:00:00"), duration: 90, note: 'Morning nap' },
  { id: 'bl-4', childId: 'child-2', type: 'feed', timestamp: format(today, "yyyy-MM-dd'T'11:30:00"), duration: 15, note: 'Lunch — puree + crackers' },
  { id: 'bl-5', childId: 'child-2', type: 'diaper', timestamp: format(subDays(today, 0), "yyyy-MM-dd'T'13:00:00"), note: 'Dirty diaper' },
  { id: 'bl-6', childId: 'child-2', type: 'milestone', timestamp: format(subDays(today, 1), "yyyy-MM-dd'T'16:00:00"), note: 'Said "mama" clearly for the first time!' },
];

// --- Countdowns ---

export const mockCountdowns: Countdown[] = [
  { id: 'cd-1', title: "Grandma's Birthday", date: format(addDays(today, 8), 'yyyy-MM-dd'), emoji: '🎂', color: '#EC4899' },
  { id: 'cd-2', title: 'Car Insurance renewal', date: format(addDays(today, 12), 'yyyy-MM-dd'), emoji: '🚗', color: '#F59E0B' },
  { id: 'cd-3', title: 'Passport expires', date: format(addDays(today, 45), 'yyyy-MM-dd'), emoji: '🛂', color: '#EF4444' },
  { id: 'cd-4', title: 'Anniversary', date: '2027-02-14', emoji: '❤️', color: '#8B5CF6' },
  { id: 'cd-5', title: 'Summer vacation', date: format(addDays(today, 30), 'yyyy-MM-dd'), emoji: '🏖️', color: '#3B82F6' },
];

// --- Helpers ---

export function getDaysSinceTogether(): number {
  const togetherDate = new Date(household.togetherSince || household.createdAt);
  return differenceInDays(today, togetherDate);
}

// --- People by Mode ---

export function getPeopleForMode(mode: 'single' | 'couple' | 'family' | 'parenting'): Array<{ id: string; name: string; color: string; role: string }> {
  switch (mode) {
    case 'single':
      return [
        { id: currentUser.id, name: currentUser.name, color: currentUser.color || '#3B82F6', role: 'you' },
      ];
    case 'couple':
      return [
        { id: currentUser.id, name: currentUser.name, color: currentUser.color || '#3B82F6', role: 'you' },
        { id: partner.id, name: partner.name, color: partner.color || '#10B981', role: 'partner' },
      ];
    case 'family':
      return [
        { id: currentUser.id, name: currentUser.name, color: currentUser.color || '#3B82F6', role: 'you' },
        { id: partner.id, name: partner.name, color: partner.color || '#10B981', role: 'partner' },
        ...familyMembers.map(f => ({ id: f.id, name: f.name, color: f.color, role: f.relationship })),
        ...mockChildren.map(c => ({ id: c.id, name: c.name, color: c.color, role: 'child' })),
      ];
    case 'parenting':
      return [
        { id: currentUser.id, name: currentUser.name, color: currentUser.color || '#3B82F6', role: 'you' },
        { id: partner.id, name: partner.name, color: partner.color || '#10B981', role: 'partner' },
        ...mockChildren.map(c => ({ id: c.id, name: c.name, color: c.color, role: 'child' })),
      ];
  }
}

// --- Mode Greetings ---

export const modeGreetings: Record<string, { title: string; subtitle: string }> = {
  single: { title: 'Your Day', subtitle: 'Personal dashboard' },
  couple: { title: 'Our Day', subtitle: 'Together with {partner}' },
  family: { title: 'Family Hub', subtitle: 'Everyone\'s day at a glance' },
  parenting: { title: 'Kids Corner', subtitle: 'Track, plan & nurture' },
};
