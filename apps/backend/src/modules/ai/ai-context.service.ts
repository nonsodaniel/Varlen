import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';

export interface UserContext {
  user: {
    name: string;
    lifeMode: string;
    memberSince: string;
    isPremium: boolean;
    timezone?: string;
    country?: string;
  };
  household: {
    name: string;
    mode: string;
    memberCount: number;
    members: { name: string; role: string }[];
    children?: { name: string; age: number }[];
    daysTogether?: number;
  } | null;
  today: {
    date: string;
    dayOfWeek: string;
    eventsCount: number;
    events: { title: string; time: string; shared: boolean }[];
    tasksCount: number;
    overdueTasks: { title: string; daysOverdue: number }[];
    tasksDueToday: string[];
    incompleteTasks: number;
  };
  finances: {
    monthlyBudgetTotal: number;
    monthlySpent: number;
    budgetUtilization: string;
    overBudgetCategories: string[];
    unsettledBalance: number;
    currency: string;
    recentExpenseCategories: string[];
  };
  wellness: {
    loggedToday: boolean;
    lastMood?: number;
    moodTrend: string;
    daysSinceLastLog: number;
    avgSleepLastWeek?: number;
  };
  habits: {
    totalRoutines: number;
    enabledRoutines: number;
    routineNames: string[];
  };
  meals: {
    hasMealPlanToday: boolean;
    unplannedMeals: string[];
  };
  goals: {
    activeGoals: number;
    nearCompletion: { title: string; percentComplete: number }[];
  };
  shopping: {
    totalUncheckedItems: number;
    listNames: string[];
  };
  upcoming: {
    countdowns: { title: string; daysAway: number }[];
    tomorrowEvents: number;
    weekEvents: number;
  };
  featureUsage: {
    usedFeatures: string[];
    unusedFeatures: string[];
  };
}

@Injectable()
export class AiContextService {
  private readonly logger = new Logger(AiContextService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async buildContext(userId: string): Promise<UserContext> {
    const cacheKey = `ai:context:${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const context = await this.buildFreshContext(userId);

    // Cache for 5 minutes
    await this.redis.set(cacheKey, JSON.stringify(context), 300);

    return context;
  }

  private async buildFreshContext(userId: string): Promise<UserContext> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get user and membership first
    const [user, membership] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.householdMember.findFirst({
        where: { userId, leftAt: null },
        include: {
          household: {
            include: {
              members: {
                where: { leftAt: null },
                include: { user: { select: { name: true } } },
              },
              children: { where: { deletedAt: null } },
            },
          },
        },
      }),
    ]);

    if (!user) {
      throw new Error('User not found');
    }

    const householdId = membership?.householdId;
    const household = membership?.household;

    // Run all data queries in parallel
    const [
      todayEvents,
      tomorrowEventsCount,
      weekEventsCount,
      incompleteTasks,
      overdueTasks,
      tasksDueToday,
      budgets,
      monthExpenses,
      unsettledExpenses,
      wellnessToday,
      wellnessRecent,
      routines,
      activeGoals,
      shoppingLists,
      countdowns,
      todayMealPlans,
      subscription,
      taskCount,
      expenseCount,
      eventCount,
      wellnessCount,
      goalCount,
      journalCount,
      mealCount,
    ] = await Promise.all([
      // Today's events
      householdId
        ? this.prisma.calendarEvent.findMany({
            where: {
              householdId,
              deletedAt: null,
              startDate: { gte: todayStart, lte: todayEnd },
            },
            orderBy: { startDate: 'asc' },
            take: 5,
            select: { title: true, startDate: true, shared: true },
          })
        : [],
      // Tomorrow's events count
      householdId
        ? this.prisma.calendarEvent.count({
            where: {
              householdId,
              deletedAt: null,
              startDate: { gte: tomorrowStart, lte: tomorrowEnd },
            },
          })
        : 0,
      // This week's events count
      householdId
        ? this.prisma.calendarEvent.count({
            where: {
              householdId,
              deletedAt: null,
              startDate: { gte: todayStart, lte: weekEnd },
            },
          })
        : 0,
      // Incomplete tasks
      householdId
        ? this.prisma.task.count({
            where: { householdId, deletedAt: null, completed: false },
          })
        : 0,
      // Overdue tasks
      householdId
        ? this.prisma.task.findMany({
            where: {
              householdId,
              deletedAt: null,
              completed: false,
              dueDate: { lt: todayStart },
            },
            orderBy: { dueDate: 'asc' },
            take: 3,
            select: { title: true, dueDate: true },
          })
        : [],
      // Tasks due today
      householdId
        ? this.prisma.task.findMany({
            where: {
              householdId,
              deletedAt: null,
              completed: false,
              dueDate: { gte: todayStart, lte: todayEnd },
            },
            take: 5,
            select: { title: true },
          })
        : [],
      // Budgets
      householdId
        ? this.prisma.budget.findMany({
            where: { householdId, deletedAt: null },
            select: { category: true, limit: true, spent: true },
          })
        : [],
      // Month's expenses by category
      householdId
        ? this.prisma.expense.groupBy({
            by: ['category'],
            where: {
              householdId,
              deletedAt: null,
              date: { gte: monthStart },
            },
            _sum: { amount: true },
            _count: true,
            orderBy: { _sum: { amount: 'desc' } },
            take: 5,
          })
        : [],
      // Unsettled expenses for user
      householdId
        ? this.prisma.expense.findMany({
            where: {
              householdId,
              deletedAt: null,
              settled: false,
            },
            include: {
              splits: { where: { userId } },
            },
          })
        : [],
      // Wellness today
      this.prisma.wellnessEntry.findFirst({
        where: {
          createdById: userId,
          date: { gte: todayStart, lte: todayEnd },
        },
      }),
      // Recent wellness entries (last 7 days)
      this.prisma.wellnessEntry.findMany({
        where: {
          createdById: userId,
          date: { gte: sevenDaysAgo },
        },
        orderBy: { date: 'desc' },
        take: 7,
        select: { mood: true, sleep: true, date: true },
      }),
      // Routines
      householdId
        ? this.prisma.routine.findMany({
            where: { householdId, deletedAt: null },
            select: { title: true, enabled: true },
          })
        : [],
      // Active goals
      householdId
        ? this.prisma.goal.findMany({
            where: { householdId, deletedAt: null },
            select: { title: true, progress: true, target: true },
          })
        : [],
      // Shopping lists with unchecked item counts
      householdId
        ? this.prisma.shoppingList.findMany({
            where: { householdId, deletedAt: null },
            include: {
              items: {
                where: { deletedAt: null, checked: false },
                select: { id: true },
              },
            },
          })
        : [],
      // Countdowns
      householdId
        ? this.prisma.countdown.findMany({
            where: {
              householdId,
              deletedAt: null,
              date: { gte: now },
            },
            orderBy: { date: 'asc' },
            take: 3,
            select: { title: true, date: true },
          })
        : [],
      // Today's meal plans
      householdId
        ? this.prisma.mealPlan.findMany({
            where: {
              householdId,
              date: { gte: todayStart, lte: todayEnd },
            },
            select: { mealType: true },
          })
        : [],
      // Subscription status
      this.prisma.appSubscription.findFirst({
        where: { userId, status: 'ACTIVE' },
      }),
      // Feature usage counts
      householdId
        ? this.prisma.task.count({ where: { householdId, deletedAt: null } })
        : 0,
      householdId
        ? this.prisma.expense.count({ where: { householdId, deletedAt: null } })
        : 0,
      householdId
        ? this.prisma.calendarEvent.count({ where: { householdId, deletedAt: null } })
        : 0,
      this.prisma.wellnessEntry.count({ where: { createdById: userId } }),
      householdId
        ? this.prisma.goal.count({ where: { householdId, deletedAt: null } })
        : 0,
      this.prisma.journalEntry.count({ where: { createdById: userId, deletedAt: null } }),
      householdId
        ? this.prisma.meal.count({ where: { householdId, deletedAt: null } })
        : 0,
    ]);

    // Build household context
    let householdContext: UserContext['household'] = null;
    if (household) {
      const daysTogether = household.togetherSince
        ? Math.floor(
            (now.getTime() - new Date(household.togetherSince).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : undefined;

      householdContext = {
        name: household.name,
        mode: household.mode,
        memberCount: household.members.length,
        members: household.members.map((m) => ({
          name: m.user.name,
          role: m.role,
        })),
        children: household.children.map((c) => ({
          name: c.name,
          age: Math.floor(
            (now.getTime() - new Date(c.dateOfBirth).getTime()) /
              (1000 * 60 * 60 * 24 * 365.25),
          ),
        })),
        daysTogether,
      };
    }

    // Build finances context
    const totalBudget = budgets.reduce(
      (sum, b) => sum + Number(b.limit),
      0,
    );
    const totalSpent = budgets.reduce(
      (sum, b) => sum + Number(b.spent),
      0,
    );
    const overBudget = budgets
      .filter((b) => Number(b.spent) > Number(b.limit))
      .map((b) => b.category);

    // Calculate unsettled balance
    let unsettledBalance = 0;
    for (const exp of unsettledExpenses) {
      if (exp.paidById === userId) {
        // User paid, others owe them
        const othersShare = exp.splits
          .filter((s) => s.userId !== userId)
          .reduce((sum, s) => sum + Number(s.amount), 0);
        unsettledBalance += othersShare;
      } else {
        // Someone else paid, user owes
        const userShare = exp.splits
          .filter((s) => s.userId === userId)
          .reduce((sum, s) => sum + Number(s.amount), 0);
        unsettledBalance -= userShare;
      }
    }

    // Build wellness context
    const daysSinceLastLog =
      wellnessRecent.length > 0
        ? Math.floor(
            (now.getTime() - new Date(wellnessRecent[0].date).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : -1;

    let moodTrend = 'unknown';
    if (wellnessRecent.length >= 3) {
      const recentAvg =
        wellnessRecent
          .slice(0, 3)
          .reduce((sum, e) => sum + e.mood, 0) / 3;
      const olderAvg =
        wellnessRecent.slice(3).length > 0
          ? wellnessRecent
              .slice(3)
              .reduce((sum, e) => sum + e.mood, 0) /
            wellnessRecent.slice(3).length
          : recentAvg;
      if (recentAvg > olderAvg + 0.3) moodTrend = 'improving';
      else if (recentAvg < olderAvg - 0.3) moodTrend = 'declining';
      else moodTrend = 'stable';
    }

    const avgSleep =
      wellnessRecent.length > 0
        ? wellnessRecent.reduce((sum, e) => sum + e.sleep, 0) /
          wellnessRecent.length
        : undefined;

    // Meal plan status
    const allMealTypes = ['BREAKFAST', 'LUNCH', 'DINNER'];
    const plannedMealTypes = todayMealPlans.map((mp) => mp.mealType);
    const unplannedMeals = allMealTypes.filter(
      (t) => !plannedMealTypes.includes(t as any),
    );

    // Feature usage detection
    const usedFeatures: string[] = [];
    const unusedFeatures: string[] = [];

    const featureChecks = [
      { key: 'Tasks', count: taskCount },
      { key: 'Expenses', count: expenseCount },
      { key: 'Calendar', count: eventCount },
      { key: 'Wellness', count: wellnessCount },
      { key: 'Goals', count: goalCount },
      { key: 'Journal', count: journalCount },
      { key: 'Meals', count: mealCount },
      { key: 'Shopping', count: shoppingLists.length },
    ];

    for (const check of featureChecks) {
      if (check.count > 0) {
        usedFeatures.push(check.key);
      } else {
        unusedFeatures.push(check.key);
      }
    }

    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    const context: UserContext = {
      user: {
        name: user.name,
        lifeMode: household?.mode || 'SINGLE',
        memberSince: user.createdAt.toISOString().split('T')[0],
        isPremium: !!subscription,
        country: user.country || undefined,
      },
      household: householdContext,
      today: {
        date: todayStart.toISOString().split('T')[0],
        dayOfWeek: days[now.getDay()],
        eventsCount: todayEvents.length,
        events: todayEvents.map((e) => ({
          title: e.title,
          time: e.startDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
          shared: e.shared,
        })),
        tasksCount: incompleteTasks + overdueTasks.length,
        overdueTasks: overdueTasks.map((t) => ({
          title: t.title,
          daysOverdue: Math.floor(
            (now.getTime() - new Date(t.dueDate!).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        })),
        tasksDueToday: tasksDueToday.map((t) => t.title),
        incompleteTasks,
      },
      finances: {
        monthlyBudgetTotal: totalBudget,
        monthlySpent: totalSpent,
        budgetUtilization:
          totalBudget > 0
            ? `${Math.round((totalSpent / totalBudget) * 100)}%`
            : 'N/A',
        overBudgetCategories: overBudget,
        unsettledBalance: Math.round(unsettledBalance * 100) / 100,
        currency: 'USD',
        recentExpenseCategories: monthExpenses
          .slice(0, 3)
          .map((e) => e.category),
      },
      wellness: {
        loggedToday: !!wellnessToday,
        lastMood: wellnessRecent[0]?.mood,
        moodTrend,
        daysSinceLastLog: daysSinceLastLog >= 0 ? daysSinceLastLog : -1,
        avgSleepLastWeek: avgSleep
          ? Math.round(avgSleep * 10) / 10
          : undefined,
      },
      habits: {
        totalRoutines: routines.length,
        enabledRoutines: routines.filter((r) => r.enabled).length,
        routineNames: routines
          .filter((r) => r.enabled)
          .map((r) => r.title)
          .slice(0, 5),
      },
      meals: {
        hasMealPlanToday: todayMealPlans.length > 0,
        unplannedMeals: unplannedMeals.map((m) => m.toLowerCase()),
      },
      goals: {
        activeGoals: activeGoals.length,
        nearCompletion: activeGoals
          .filter((g) => g.target > 0)
          .map((g) => ({
            title: g.title,
            percentComplete: Math.round((g.progress / g.target) * 100),
          }))
          .filter((g) => g.percentComplete >= 70)
          .slice(0, 3),
      },
      shopping: {
        totalUncheckedItems: shoppingLists.reduce(
          (sum, l) => sum + l.items.length,
          0,
        ),
        listNames: shoppingLists.map((l) => l.name),
      },
      upcoming: {
        countdowns: countdowns.map((c) => ({
          title: c.title,
          daysAway: Math.ceil(
            (new Date(c.date).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        })),
        tomorrowEvents: tomorrowEventsCount,
        weekEvents: weekEventsCount,
      },
      featureUsage: {
        usedFeatures,
        unusedFeatures,
      },
    };

    return context;
  }
}
