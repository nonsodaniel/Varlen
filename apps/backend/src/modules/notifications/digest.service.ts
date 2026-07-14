import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private pushService: PushService,
    private redis: RedisService,
  ) {}

  @Cron('0 9 * * 1') // Every Monday at 9 AM
  async sendWeeklyDigest() {
    // Distributed lock: only one instance runs the digest
    const lockKey = 'digest:weekly:lock';
    const lockAcquired = await this.redis.getClient().set(lockKey, '1', 'EX', 3600, 'NX');
    if (!lockAcquired) {
      this.logger.log('Weekly digest already running on another instance, skipping');
      return;
    }

    try {
      this.logger.log('Starting weekly digest...');

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Process users in batches to avoid loading all into memory
      const BATCH_SIZE = 50;
      let cursor: string | undefined;
      let totalProcessed = 0;

      while (true) {
        const users = await this.prisma.user.findMany({
          where: { deletedAt: null, ...(cursor ? { id: { gt: cursor } } : {}) },
          select: { id: true, name: true },
          orderBy: { id: 'asc' },
          take: BATCH_SIZE,
        });

        if (users.length === 0) break;

        await Promise.allSettled(
          users.map((user) => this.buildAndSendDigest(user.id, user.name, oneWeekAgo)),
        );

        totalProcessed += users.length;
        cursor = users[users.length - 1].id;

        if (users.length < BATCH_SIZE) break;
      }

      this.logger.log(`Weekly digest sent to ${totalProcessed} users`);
    } catch (error) {
      this.logger.error('Weekly digest cron job failed', error);
    } finally {
      // Release lock
      await this.redis.getClient().del(lockKey).catch(() => {});
    }
  }

  private async buildAndSendDigest(
    userId: string,
    userName: string,
    since: Date,
  ) {
    // Get user's household IDs
    const memberships = await this.prisma.householdMember.findMany({
      where: { userId, leftAt: null, household: { deletedAt: null } },
      select: { householdId: true },
    });
    const householdIds = memberships.map((m) => m.householdId);

    if (householdIds.length === 0) return;

    // Query expenses, tasks, and goals in parallel
    const [expenseAgg, completedTasks, goals] = await Promise.all([
      // Use SQL SUM instead of fetching all rows
      this.prisma.expense.aggregate({
        where: {
          householdId: { in: householdIds },
          createdAt: { gte: since },
          deletedAt: null,
        },
        _sum: { amount: true },
      }),
      this.prisma.task.count({
        where: {
          householdId: { in: householdIds },
          completed: true,
          updatedAt: { gte: since },
        },
      }),
      this.prisma.goal.findMany({
        where: { householdId: { in: householdIds } },
        select: { target: true, progress: true },
      }),
    ]);

    const totalSpent = Number(expenseAgg._sum.amount ?? 0);
    const goalsProgress = goals.length > 0
      ? goals.reduce((sum, g) => {
          const target = typeof g.target === 'object' ? parseFloat(String(g.target)) : Number(g.target);
          const progress = typeof g.progress === 'object' ? parseFloat(String(g.progress)) : Number(g.progress);
          return sum + (target > 0 ? (progress / target) * 100 : 0);
        }, 0) / goals.length
      : 0;

    // Build digest message
    const parts: string[] = [];
    if (totalSpent > 0) parts.push(`$${Math.round(totalSpent)} spent`);
    if (completedTasks > 0) parts.push(`${completedTasks} tasks done`);
    if (goals.length > 0) parts.push(`${Math.round(goalsProgress)}% avg goal progress`);

    if (parts.length === 0) return; // Nothing to report

    const body = `This week: ${parts.join(' · ')}`;

    // Create in-app notification
    const primaryHouseholdId = householdIds[0];
    await this.notificationsService.create({
      userId,
      householdId: primaryHouseholdId,
      title: 'Your weekly summary',
      body,
      type: 'SYSTEM',
      icon: 'bar-chart-outline',
    });

    // Send push notification
    await this.pushService.sendToUser(userId, 'Your weekly summary', body, {
      type: 'digest',
    });
  }
}
