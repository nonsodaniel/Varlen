import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalUsers,
      verifiedUsers,
      totalHouseholds,
      totalTasks,
      completedTasks,
      totalExpenses,
      activeSubscriptions,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { emailVerified: true, deletedAt: null } }),
      this.prisma.household.count({ where: { deletedAt: null } }),
      this.prisma.task.count({ where: { deletedAt: null } }),
      this.prisma.task.count({ where: { completed: true, deletedAt: null } }),
      this.prisma.expense.aggregate({
        where: { deletedAt: null },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.subscription.count({ where: { deletedAt: null } }),
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [newUsersThisMonth, activeUsersThisMonth] = await Promise.all([
      this.prisma.user.count({
        where: { createdAt: { gte: thirtyDaysAgo }, deletedAt: null },
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: thirtyDaysAgo } },
      }).then(r => r.length),
    ]);

    return {
      users: {
        total: totalUsers,
        verified: verifiedUsers,
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
      subscriptions: { active: activeSubscriptions },
    };
  }

  async getRecentUsers(page = 1, limit = 20) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true, email: true, name: true, emailVerified: true,
          authProvider: true, createdAt: true,
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
}
