import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      verifiedUsers,
      suspendedUsers,
      totalHouseholds,
      totalTasks,
      completedTasks,
      totalExpenses,
      totalEvents,
      totalPolls,
      totalShoppingLists,
      totalGoals,
      totalRoutines,
      totalJournalEntries,
      totalMeals,
      totalCountdowns,
      totalMemories,
      activeAppSubscriptions,
      activeHouseholdSubscriptions,
      newUsersThisMonth,
      activeUsersThisMonth,
      recentActivity,
      countryData,
      platformData,
      localAuthCount,
      googleAuthCount,
      featureFlags,
      waitlistTotal,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { emailVerified: true, deletedAt: null } }),
      this.prisma.user.count({ where: { suspendedAt: { not: null }, deletedAt: null } }),
      this.prisma.household.count({ where: { deletedAt: null } }),
      this.prisma.task.count({ where: { deletedAt: null } }),
      this.prisma.task.count({ where: { completed: true, deletedAt: null } }),
      this.prisma.expense.aggregate({
        where: { deletedAt: null },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.calendarEvent.count({ where: { deletedAt: null } }),
      this.prisma.poll.count({ where: { deletedAt: null } }),
      this.prisma.shoppingList.count({ where: { deletedAt: null } }),
      this.prisma.goal.count({ where: { deletedAt: null } }),
      this.prisma.routine.count({ where: { deletedAt: null } }),
      this.prisma.journalEntry.count({ where: { deletedAt: null } }),
      this.prisma.meal.count({ where: { deletedAt: null } }),
      this.prisma.countdown.count({ where: { deletedAt: null } }),
      this.prisma.memory.count({ where: { deletedAt: null } }),
      this.prisma.appSubscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscription.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { createdAt: { gte: thirtyDaysAgo }, deletedAt: null },
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: thirtyDaysAgo } },
      }).then(r => r.length),
      this.prisma.auditLog.findMany({
        include: { user: { select: { email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      // Country distribution
      this.prisma.user.groupBy({
        by: ['country'],
        where: { deletedAt: null, country: { not: null } },
        _count: true,
        orderBy: { _count: { country: 'desc' } },
        take: 10,
      }),
      // Platform distribution from push tokens
      this.prisma.pushToken.groupBy({
        by: ['platform'],
        where: { active: true },
        _count: true,
      }),
      // Auth provider breakdown
      this.prisma.user.count({ where: { authProvider: 'local', deletedAt: null } }),
      this.prisma.user.count({ where: { authProvider: 'google', deletedAt: null } }),
      // Feature flag summary
      this.prisma.featureFlag.findMany({
        select: { enabled: true, phase: true },
      }),
      // Waitlist total
      this.prisma.waitlistEntry.count(),
    ]);

    // Build feature flag summary
    const flagSummary = {
      total: featureFlags.length,
      enabled: featureFlags.filter(f => f.enabled).length,
      disabled: featureFlags.filter(f => !f.enabled).length,
      byPhase: {
        mvp: { total: 0, enabled: 0 },
        post_mvp: { total: 0, enabled: 0 },
        experimental: { total: 0, enabled: 0 },
      },
    };
    for (const f of featureFlags) {
      const phase = f.phase as keyof typeof flagSummary.byPhase;
      if (flagSummary.byPhase[phase]) {
        flagSummary.byPhase[phase].total++;
        if (f.enabled) flagSummary.byPhase[phase].enabled++;
      }
    }

    return {
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        suspended: suspendedUsers,
        newThisMonth: newUsersThisMonth,
        activeThisMonth: activeUsersThisMonth,
      },
      households: { total: totalHouseholds },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        completionRate: totalTasks > 0
          ? Math.round((completedTasks / totalTasks) * 100)
          : 0,
      },
      expenses: {
        count: totalExpenses._count,
        totalAmount: Number(totalExpenses._sum.amount || 0),
      },
      events: { total: totalEvents },
      polls: { total: totalPolls },
      subscriptions: {
        appActive: activeAppSubscriptions,
        householdActive: activeHouseholdSubscriptions,
      },
      featureUsage: {
        tasks: totalTasks,
        events: totalEvents,
        expenses: totalExpenses._count,
        polls: totalPolls,
        shoppingLists: totalShoppingLists,
        goals: totalGoals,
        routines: totalRoutines,
        journal: totalJournalEntries,
        meals: totalMeals,
        countdowns: totalCountdowns,
        memories: totalMemories,
      },
      countryDistribution: countryData.map(c => ({
        country: c.country || 'Unknown',
        count: c._count,
      })),
      platformDistribution: platformData.map(p => ({
        platform: p.platform,
        count: p._count,
      })),
      authBreakdown: { local: localAuthCount, google: googleAuthCount },
      featureFlagSummary: flagSummary,
      waitlist: { total: waitlistTotal },
      recentActivity,
    };
  }

  // ── Feature Flags ──

  async getFeatureFlags() {
    return this.prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async getEnabledFeatureFlags() {
    return this.prisma.featureFlag.findMany({
      where: { enabled: true },
      select: { key: true, label: true },
      orderBy: { key: 'asc' },
    });
  }

  async updateFeatureFlag(id: string, data: { label?: string; description?: string; enabled?: boolean; category?: string; phase?: string }) {
    return this.prisma.featureFlag.update({
      where: { id },
      data,
    });
  }

  async bulkUpdateFeatureFlags(filter: { phase?: string; category?: string }, enabled: boolean) {
    const where: Record<string, string> = {};
    if (filter.phase) where.phase = filter.phase;
    if (filter.category) where.category = filter.category;
    const result = await this.prisma.featureFlag.updateMany({
      where,
      data: { enabled },
    });
    return { updated: result.count, enabled };
  }

  // ── User Management ──

  async getRecentUsers(page = 1, limit = 20) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true, email: true, name: true, emailVerified: true,
          authProvider: true, country: true, suspendedAt: true, createdAt: true,
          _count: { select: { memberships: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
    ]);

    return { users, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getAdminUserDetail(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, avatarUrl: true, color: true,
        emailVerified: true, authProvider: true, country: true,
        suspendedAt: true, createdAt: true, updatedAt: true, deletedAt: true,
        memberships: {
          where: { leftAt: null },
          include: { household: { select: { id: true, name: true, type: true, mode: true } } },
        },
        appSubscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true, plan: true, status: true, platform: true,
            entitlement: true, expiresAt: true,
          },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, action: true, resource: true, createdAt: true },
        },
        _count: {
          select: {
            createdTasks: true,
            createdEvents: true,
            paidExpenses: true,
            notifications: true,
          },
        },
      },
    });
  }

  async suspendUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { suspendedAt: new Date() },
      select: { id: true, email: true, suspendedAt: true },
    });
  }

  async unsuspendUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { suspendedAt: null },
      select: { id: true, email: true, suspendedAt: true },
    });
  }

  async adminDeleteUser(userId: string) {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.householdMember.updateMany({
        where: { userId, leftAt: null },
        data: { leftAt: now },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { deletedAt: now },
      }),
    ]);
    return { message: 'User deleted' };
  }

  async sendSystemNotification(userId: string, title: string, body: string) {
    return this.prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type: 'SYSTEM',
      },
    });
  }

  // ── Audit Logs ──

  async getRecentAuditLogs(page = 1, limit = 50) {
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        include: { user: { select: { email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count(),
    ]);

    return { logs, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ── Households ──

  async getHouseholdOverview(page = 1, limit = 20) {
    const [households, total] = await Promise.all([
      this.prisma.household.findMany({
        where: { deletedAt: null },
        select: {
          id: true, name: true, mode: true, type: true, emoji: true, createdAt: true,
          _count: {
            select: {
              members: { where: { leftAt: null } },
              tasks: { where: { deletedAt: null } },
              expenses: { where: { deletedAt: null } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.household.count({ where: { deletedAt: null } }),
    ]);

    return { households, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ── Platform Activity ──

  async getPlatformActivity(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [tasksCreated, tasksCompleted, eventsCreated, expensesCreated, pollsCreated, usersCreated] = await Promise.all([
      this.prisma.task.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
      this.prisma.task.count({ where: { completedAt: { gte: since }, deletedAt: null } }),
      this.prisma.calendarEvent.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
      this.prisma.expense.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
      this.prisma.poll.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
      this.prisma.user.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
    ]);

    return { period: `${days}d`, tasksCreated, tasksCompleted, eventsCreated, expensesCreated, pollsCreated, usersCreated };
  }

  // ── Analytics ──

  async getAnalytics() {
    const now = new Date();
    const oneDayAgo = new Date(now); oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ninetyDaysAgo = new Date(now); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [
      dauResult,
      wauResult,
      mauResult,
      signupsByDay,
      countryDistribution,
      authLocal,
      authGoogle,
    ] = await Promise.all([
      // DAU: unique users with audit log entries in last 24h
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: oneDayAgo } },
      }),
      // WAU: unique users with audit log entries in last 7d
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      // MAU: unique users with audit log entries in last 30d
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      // User signups in last 90 days grouped by date
      this.prisma.$queryRawUnsafe<{ date: string; count: bigint }[]>(
        `SELECT DATE("createdAt") as date, COUNT(*)::bigint as count FROM users WHERE "deletedAt" IS NULL AND "createdAt" >= $1 GROUP BY DATE("createdAt") ORDER BY date ASC`,
        ninetyDaysAgo,
      ),
      // Country distribution
      this.prisma.user.groupBy({
        by: ['country'],
        where: { deletedAt: null, country: { not: null } },
        _count: true,
        orderBy: { _count: { country: 'desc' } },
        take: 10,
      }),
      // Auth provider counts
      this.prisma.user.count({ where: { authProvider: 'local', deletedAt: null } }),
      this.prisma.user.count({ where: { authProvider: 'google', deletedAt: null } }),
    ]);

    // Build cumulative growth data from signups
    const totalBefore90d = await this.prisma.user.count({
      where: { deletedAt: null, createdAt: { lt: ninetyDaysAgo } },
    });

    const signupMap = new Map<string, number>();
    for (const row of signupsByDay) {
      const dateStr = typeof row.date === 'string'
        ? row.date.slice(0, 10)
        : new Date(row.date).toISOString().slice(0, 10);
      signupMap.set(dateStr, Number(row.count));
    }

    const userGrowth: { date: string; users: number }[] = [];
    for (let i = 89; i >= 0; i -= 3) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dayStr = day.toISOString().slice(0, 10);
      // Sum signups from 90 days ago up to this day
      let sumToDay = totalBefore90d;
      for (const [d, c] of signupMap.entries()) {
        if (d <= dayStr) sumToDay += c;
      }
      userGrowth.push({
        date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        users: sumToDay,
      });
    }

    // Signups by day of week from the raw signup data
    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
    for (const row of signupsByDay) {
      const d = new Date(row.date);
      weekdayCounts[d.getDay()] += Number(row.count);
    }
    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const signupsByWeekday = weekdayNames.map((day, i) => ({ day, signups: weekdayCounts[i] }));

    return {
      engagement: {
        dau: dauResult.length,
        wau: wauResult.length,
        mau: mauResult.length,
      },
      userGrowth,
      signupsByWeekday,
      countryDistribution: countryDistribution.map(c => ({
        country: c.country || 'Unknown',
        count: c._count,
      })),
      authBreakdown: [
        { provider: 'Email', count: authLocal },
        { provider: 'Google', count: authGoogle },
      ],
    };
  }
}
