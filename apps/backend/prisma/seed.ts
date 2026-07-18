import { PrismaClient, LifeMode, HouseholdRole, Priority, RecurringType, ExpenseCategory, NotificationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean all tables in correct order
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.syncCheckpoint.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.expenseSplit.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.shoppingItem.deleteMany(),
    prisma.shoppingList.deleteMany(),
    prisma.task.deleteMany(),
    prisma.calendarEvent.deleteMany(),
    prisma.babyLog.deleteMany(),
    prisma.pollOption.deleteMany(),
    prisma.poll.deleteMany(),
    prisma.goal.deleteMany(),
    prisma.journalEntry.deleteMany(),
    prisma.timelineEntry.deleteMany(),
    prisma.routine.deleteMany(),
    prisma.wellnessEntry.deleteMany(),
    prisma.countdown.deleteMany(),
    prisma.budget.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.memory.deleteMany(),
    prisma.child.deleteMany(),
    prisma.householdMember.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.featureFlag.deleteMany(),
    prisma.household.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash('password123', 12);

  // ── Users ──
  const alex = await prisma.user.create({
    data: {
      id: 'user-1',
      email: 'alex@example.com',
      passwordHash,
      name: 'Alex',
      color: '#3B82F6',
      emailVerified: true,
    },
  });

  const jordan = await prisma.user.create({
    data: {
      id: 'user-2',
      email: 'jordan@example.com',
      passwordHash,
      name: 'Jordan',
      color: '#10B981',
      emailVerified: true,
    },
  });

  // ── Household ──
  const household = await prisma.household.create({
    data: {
      id: 'household-1',
      name: 'Our Home',
      mode: LifeMode.COUPLE,
      togetherSince: new Date('2023-02-14'),
      anniversary: new Date('2023-02-14'),
    },
  });

  await prisma.householdMember.createMany({
    data: [
      { userId: alex.id, householdId: household.id, role: HouseholdRole.OWNER },
      { userId: jordan.id, householdId: household.id, role: HouseholdRole.PARTNER },
    ],
  });

  // ── Children ──
  await prisma.child.createMany({
    data: [
      {
        id: 'child-1',
        householdId: household.id,
        name: 'Emma',
        dateOfBirth: new Date('2019-03-15'),
        color: '#EC4899',
        schoolName: 'Riverside Elementary',
        bedtime: '8:30 PM',
        allergies: ['peanuts'],
      },
      {
        id: 'child-2',
        householdId: household.id,
        name: 'Liam',
        dateOfBirth: new Date('2023-05-22'),
        color: '#F59E0B',
        notes: 'Loves dinosaurs',
      },
    ],
  });

  // ── Calendar Events ──
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  await prisma.calendarEvent.createMany({
    data: [
      {
        id: 'event-1',
        householdId: household.id,
        title: 'Team Standup',
        startDate: new Date(`${todayStr}T09:00:00`),
        endDate: new Date(`${todayStr}T09:30:00`),
        color: '#6366F1',
        createdById: alex.id,
        shared: false,
      },
      {
        id: 'event-2',
        householdId: household.id,
        title: 'Grocery Shopping',
        startDate: new Date(`${todayStr}T11:00:00`),
        endDate: new Date(`${todayStr}T12:00:00`),
        color: '#10B981',
        createdById: alex.id,
        shared: true,
      },
      {
        id: 'event-3',
        householdId: household.id,
        title: 'Yoga Class',
        startDate: new Date(`${todayStr}T07:00:00`),
        endDate: new Date(`${todayStr}T08:00:00`),
        color: '#EC4899',
        createdById: jordan.id,
        shared: false,
      },
      {
        id: 'event-4',
        householdId: household.id,
        title: 'Date Night',
        startDate: new Date(`${todayStr}T19:00:00`),
        endDate: new Date(`${todayStr}T22:00:00`),
        color: '#F59E0B',
        location: 'La Piazza Restaurant',
        createdById: jordan.id,
        shared: true,
      },
      {
        id: 'event-5',
        householdId: household.id,
        title: 'Dentist Appointment',
        description: 'Regular checkup',
        startDate: new Date(`${todayStr}T14:00:00`),
        endDate: new Date(`${todayStr}T15:00:00`),
        color: '#EF4444',
        createdById: alex.id,
        shared: false,
      },
      {
        id: 'event-6',
        householdId: household.id,
        title: 'Emma - Soccer Practice',
        startDate: new Date(`${todayStr}T16:00:00`),
        endDate: new Date(`${todayStr}T17:30:00`),
        color: '#EC4899',
        createdById: jordan.id,
        shared: true,
      },
    ],
  });

  // ── Tasks ──
  await prisma.task.createMany({
    data: [
      {
        id: 'task-1',
        householdId: household.id,
        title: 'Buy birthday gift for Mom',
        priority: Priority.HIGH,
        dueDate: new Date(Date.now() + 3 * 86400000),
        createdById: alex.id,
        assignedToId: alex.id,
        shared: true,
      },
      {
        id: 'task-2',
        householdId: household.id,
        title: 'Schedule car maintenance',
        priority: Priority.MEDIUM,
        createdById: jordan.id,
        assignedToId: jordan.id,
        shared: true,
      },
      {
        id: 'task-3',
        householdId: household.id,
        title: 'Clean kitchen',
        priority: Priority.MEDIUM,
        createdById: alex.id,
        assignedToId: jordan.id,
        shared: true,
        isChore: true,
        recurring: RecurringType.WEEKLY,
      },
      {
        id: 'task-4',
        householdId: household.id,
        title: 'Take out trash',
        priority: Priority.LOW,
        createdById: jordan.id,
        assignedToId: alex.id,
        shared: true,
        isChore: true,
        recurring: RecurringType.WEEKLY,
      },
      {
        id: 'task-5',
        householdId: household.id,
        title: 'Do laundry',
        priority: Priority.MEDIUM,
        createdById: alex.id,
        assignedToId: alex.id,
        shared: true,
        isChore: true,
      },
      {
        id: 'task-6',
        householdId: household.id,
        title: 'Pack school lunch for Emma',
        priority: Priority.HIGH,
        createdById: jordan.id,
        assignedToId: jordan.id,
        shared: true,
        isChore: true,
        recurring: RecurringType.DAILY,
      },
      {
        id: 'task-7',
        householdId: household.id,
        title: 'Review monthly budget',
        priority: Priority.LOW,
        createdById: alex.id,
        assignedToId: alex.id,
        shared: false,
        completed: true,
        completedAt: new Date(Date.now() - 86400000),
      },
    ],
  });

  // ── Shopping Lists ──
  const groceryList = await prisma.shoppingList.create({
    data: {
      id: 'list-1',
      householdId: household.id,
      name: 'Groceries',
      shared: true,
      createdById: alex.id,
    },
  });

  await prisma.shoppingItem.createMany({
    data: [
      { id: 'item-1', listId: groceryList.id, name: 'Milk', quantity: 2, unit: 'gallons', category: 'Dairy', addedById: alex.id },
      { id: 'item-2', listId: groceryList.id, name: 'Eggs', quantity: 1, unit: 'dozen', category: 'Dairy', addedById: alex.id },
      { id: 'item-3', listId: groceryList.id, name: 'Bread', quantity: 1, unit: 'loaf', category: 'Bakery', addedById: jordan.id },
      { id: 'item-4', listId: groceryList.id, name: 'Chicken breast', quantity: 2, unit: 'lbs', category: 'Meat', addedById: jordan.id },
      { id: 'item-5', listId: groceryList.id, name: 'Bananas', quantity: 6, category: 'Produce', addedById: alex.id, checked: true },
      { id: 'item-6', listId: groceryList.id, name: 'Pasta', quantity: 2, unit: 'boxes', category: 'Pantry', addedById: jordan.id },
    ],
  });

  const householdList = await prisma.shoppingList.create({
    data: {
      id: 'list-2',
      householdId: household.id,
      name: 'Household',
      shared: true,
      createdById: jordan.id,
    },
  });

  await prisma.shoppingItem.createMany({
    data: [
      { id: 'item-7', listId: householdList.id, name: 'Paper towels', quantity: 1, category: 'Cleaning', addedById: jordan.id },
      { id: 'item-8', listId: householdList.id, name: 'Dish soap', quantity: 1, category: 'Cleaning', addedById: alex.id },
      { id: 'item-9', listId: householdList.id, name: 'Light bulbs', quantity: 4, category: 'Home', addedById: alex.id },
    ],
  });

  // ── Expenses ──
  const expense1 = await prisma.expense.create({
    data: {
      id: 'expense-1',
      householdId: household.id,
      title: 'Groceries at Whole Foods',
      amount: 127.50,
      category: ExpenseCategory.GROCERIES,
      date: new Date(Date.now() - 2 * 86400000),
      paidById: alex.id,
    },
  });
  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: expense1.id, userId: alex.id, amount: 63.75 },
      { expenseId: expense1.id, userId: jordan.id, amount: 63.75 },
    ],
  });

  const expense2 = await prisma.expense.create({
    data: {
      id: 'expense-2',
      householdId: household.id,
      title: 'Electric bill',
      amount: 89.00,
      category: ExpenseCategory.UTILITIES,
      date: new Date(Date.now() - 5 * 86400000),
      paidById: jordan.id,
    },
  });
  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: expense2.id, userId: alex.id, amount: 44.50 },
      { expenseId: expense2.id, userId: jordan.id, amount: 44.50 },
    ],
  });

  const expense3 = await prisma.expense.create({
    data: {
      id: 'expense-3',
      householdId: household.id,
      title: 'Dinner at La Piazza',
      amount: 95.00,
      category: ExpenseCategory.DINING,
      date: new Date(Date.now() - 86400000),
      paidById: alex.id,
    },
  });
  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: expense3.id, userId: alex.id, amount: 47.50 },
      { expenseId: expense3.id, userId: jordan.id, amount: 47.50 },
    ],
  });

  const expense4 = await prisma.expense.create({
    data: {
      id: 'expense-4',
      householdId: household.id,
      title: 'Gas',
      amount: 55.00,
      category: ExpenseCategory.TRANSPORT,
      date: new Date(Date.now() - 3 * 86400000),
      paidById: jordan.id,
      settled: true,
      settledAt: new Date(Date.now() - 86400000),
    },
  });
  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: expense4.id, userId: alex.id, amount: 27.50 },
      { expenseId: expense4.id, userId: jordan.id, amount: 27.50 },
    ],
  });

  // ── Budgets ──
  await prisma.budget.createMany({
    data: [
      { householdId: household.id, category: ExpenseCategory.GROCERIES, limit: 600, spent: 340 },
      { householdId: household.id, category: ExpenseCategory.DINING, limit: 300, spent: 195 },
      { householdId: household.id, category: ExpenseCategory.UTILITIES, limit: 200, spent: 89 },
      { householdId: household.id, category: ExpenseCategory.ENTERTAINMENT, limit: 150, spent: 45 },
      { householdId: household.id, category: ExpenseCategory.TRANSPORT, limit: 250, spent: 180 },
    ],
  });

  // ── Notifications ──
  await prisma.notification.createMany({
    data: [
      {
        userId: alex.id,
        householdId: household.id,
        title: 'New shared event',
        body: 'Jordan added "Date Night" to the calendar',
        type: NotificationType.EVENT,
        icon: 'calendar',
      },
      {
        userId: alex.id,
        householdId: household.id,
        title: 'Task assigned',
        body: 'Jordan assigned you "Take out trash"',
        type: NotificationType.CHORE,
        icon: 'checkmark-circle',
      },
      {
        userId: alex.id,
        householdId: household.id,
        title: 'Expense added',
        body: 'Jordan added "Electric bill" - $89.00',
        type: NotificationType.ACTIVITY,
        icon: 'wallet',
      },
      {
        userId: jordan.id,
        householdId: household.id,
        title: 'Task completed',
        body: 'Alex completed "Review monthly budget"',
        type: NotificationType.ACTIVITY,
        icon: 'checkmark-circle',
        read: true,
        readAt: new Date(Date.now() - 3600000),
      },
    ],
  });

  // ── Countdowns ──
  await prisma.countdown.createMany({
    data: [
      {
        householdId: household.id,
        title: 'Anniversary',
        date: new Date('2027-02-14'),
        emoji: '💕',
        color: '#EC4899',
      },
      {
        householdId: household.id,
        title: 'Beach Vacation',
        date: new Date('2026-08-15'),
        emoji: '🏖️',
        color: '#06B6D4',
      },
      {
        householdId: household.id,
        title: "Emma's Birthday",
        date: new Date('2027-03-15'),
        emoji: '🎂',
        color: '#F59E0B',
      },
    ],
  });

  // ── Baby Logs ──
  await prisma.babyLog.createMany({
    data: [
      {
        childId: 'child-2',
        type: 'feed',
        timestamp: new Date(`${todayStr}T07:30:00`),
        duration: 20,
        note: 'Breast milk, good appetite',
      },
      {
        childId: 'child-2',
        type: 'sleep',
        timestamp: new Date(`${todayStr}T09:00:00`),
        duration: 90,
        note: 'Morning nap',
      },
      {
        childId: 'child-2',
        type: 'diaper',
        timestamp: new Date(`${todayStr}T10:45:00`),
        note: 'Wet',
      },
      {
        childId: 'child-2',
        type: 'milestone',
        timestamp: new Date(Date.now() - 7 * 86400000),
        note: 'First steps!',
      },
    ],
  });

  // ── Feature Flags ──
  await prisma.featureFlag.createMany({
    data: [
      { key: 'tasks',       label: 'Tasks',          description: 'Task management and chores',       enabled: true, category: 'feature', phase: 'mvp' },
      { key: 'expenses',    label: 'Expenses',       description: 'Expense tracking and splitting',   enabled: true, category: 'feature', phase: 'mvp' },
      { key: 'calendar',    label: 'Calendar',       description: 'Calendar and events',              enabled: true, category: 'feature', phase: 'mvp' },
      { key: 'shopping',    label: 'Shopping Lists',  description: 'Shopping list management',         enabled: true, category: 'feature', phase: 'mvp' },
      { key: 'polls',       label: 'Polls',          description: 'Group polls and voting',           enabled: true, category: 'feature', phase: 'mvp' },
      { key: 'meals',       label: 'Meal Planning',   description: 'Meals and meal plans',             enabled: false, category: 'feature', phase: 'post_mvp' },
      { key: 'goals',       label: 'Goals',           description: 'Goal tracking',                    enabled: false, category: 'feature', phase: 'post_mvp' },
      { key: 'routines',    label: 'Routines',        description: 'Daily routines',                   enabled: false, category: 'feature', phase: 'post_mvp' },
      { key: 'journal',     label: 'Journal',         description: 'Journal entries',                  enabled: false, category: 'feature', phase: 'post_mvp' },
      { key: 'wellness',    label: 'Wellness',        description: 'Wellness tracking',                enabled: false, category: 'feature', phase: 'experimental' },
      { key: 'countdowns',  label: 'Countdowns',      description: 'Event countdowns',                 enabled: true, category: 'feature', phase: 'mvp' },
      { key: 'memories',    label: 'Memories',        description: 'Memory and milestone tracking',    enabled: false, category: 'feature', phase: 'post_mvp' },
      { key: 'timeline',    label: 'Timeline',        description: 'Timeline entries',                 enabled: false, category: 'feature', phase: 'experimental' },
    ],
  });

  console.log('Seed completed successfully');
  console.log('  Users: Alex (alex@example.com), Jordan (jordan@example.com)');
  console.log('  Password: password123');
  console.log('  Household: Our Home (couple mode)');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
