import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
  ) {}

  // ─── #2: Routine Reminders (every 15 minutes) ───
  @Cron('*/15 * * * *')
  async handleRoutineReminders() {
    try {
      const now = new Date();
      const currentDay = now.getDay();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const timeWindow = `${String(currentHour).padStart(2, '0')}:${String(Math.floor(currentMinute / 15) * 15).padStart(2, '0')}`;

      const routines = await this.prisma.routine.findMany({
        where: {
          enabled: true,
          deletedAt: null,
          days: { has: currentDay },
          time: { startsWith: timeWindow.substring(0, 4) },
        },
        include: {
          household: {
            include: {
              members: {
                where: { leftAt: null },
                select: { userId: true },
              },
            },
          },
        },
      });

      for (const routine of routines) {
        const targetUserId = routine.assignedToId
          || routine.household.members[0]?.userId;
        if (!targetUserId) continue;

        await this.notifications.create({
          userId: targetUserId,
          householdId: routine.householdId,
          title: `${routine.emoji || '⏰'} Routine Reminder`,
          body: `Time for: ${routine.title}`,
          type: 'REMINDER',
          icon: routine.emoji || '⏰',
          resourceId: routine.id,
          resourceType: 'routine',
        }).catch(() => {});
      }

      if (routines.length > 0) {
        this.logger.log(`Sent ${routines.length} routine reminders`);
      }
    } catch (error) {
      this.logger.error('Routine reminders job failed', error);
    }
  }

  // ─── #3: Subscription Billing Reminders (daily at 9 AM) ───
  @Cron('0 9 * * *')
  async handleSubscriptionReminders() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

      const threeDaysOut = new Date();
      threeDaysOut.setDate(threeDaysOut.getDate() + 3);
      const fourDaysOut = new Date();
      fourDaysOut.setDate(fourDaysOut.getDate() + 4);

      // Subscriptions due tomorrow
      const dueTomorrow = await this.prisma.subscription.findMany({
        where: {
          deletedAt: null,
          nextBillingDate: { gte: tomorrow, lt: dayAfterTomorrow },
        },
        include: {
          household: {
            include: {
              members: { where: { leftAt: null }, select: { userId: true } },
            },
          },
        },
      });

      for (const sub of dueTomorrow) {
        for (const member of sub.household.members) {
          await this.notifications.create({
            userId: member.userId,
            householdId: sub.householdId,
            title: '💳 Subscription Due Tomorrow',
            body: `${sub.name} — ${sub.currency} ${sub.amount} is due tomorrow`,
            type: 'REMINDER',
            icon: '💳',
            resourceId: sub.id,
            resourceType: 'subscription',
          }).catch(() => {});
        }
      }

      // Subscriptions due in 3 days
      const dueIn3Days = await this.prisma.subscription.findMany({
        where: {
          deletedAt: null,
          nextBillingDate: { gte: threeDaysOut, lt: fourDaysOut },
        },
        include: {
          household: {
            include: {
              members: { where: { leftAt: null }, select: { userId: true } },
            },
          },
        },
      });

      for (const sub of dueIn3Days) {
        for (const member of sub.household.members) {
          await this.notifications.create({
            userId: member.userId,
            householdId: sub.householdId,
            title: '📅 Upcoming Subscription',
            body: `${sub.name} — ${sub.currency} ${sub.amount} is due in 3 days`,
            type: 'REMINDER',
            icon: '📅',
            resourceId: sub.id,
            resourceType: 'subscription',
          }).catch(() => {});
        }
      }

      this.logger.log(
        `Subscription reminders: ${dueTomorrow.length} due tomorrow, ${dueIn3Days.length} due in 3 days`,
      );
    } catch (error) {
      this.logger.error('Subscription reminders job failed', error);
    }
  }

  // ─── #5: Push Notification Delivery Verification (hourly) ───
  @Cron(CronExpression.EVERY_HOUR)
  async verifyPushTokens() {
    try {
      // Deactivate push tokens that haven't been updated in 90 days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);

      const result = await this.prisma.pushToken.updateMany({
        where: {
          active: true,
          updatedAt: { lt: cutoff },
        },
        data: { active: false },
      });

      if (result.count > 0) {
        this.logger.log(`Deactivated ${result.count} stale push tokens`);
      }
    } catch (error) {
      this.logger.error('Push token verification failed', error);
    }
  }

  // ─── #7: Database Cleanup (daily at 3 AM) ───
  @Cron('0 3 * * *')
  async handleDatabaseCleanup() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Clean expired refresh tokens
      const expiredTokens = await this.prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { revokedAt: { not: null, lt: thirtyDaysAgo } },
          ],
        },
      });

      // Clean used/expired email verification codes
      const expiredVerifications = await this.prisma.emailVerification.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now }, used: false },
            { used: true, createdAt: { lt: sevenDaysAgo } },
          ],
        },
      });

      // Clean used/expired password reset codes
      const expiredResets = await this.prisma.passwordReset.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now }, used: false },
            { used: true, createdAt: { lt: sevenDaysAgo } },
          ],
        },
      });

      // Clean old audit logs (90 days)
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const oldAuditLogs = await this.prisma.auditLog.deleteMany({
        where: { createdAt: { lt: ninetyDaysAgo } },
      });

      // Clean old read notifications (30 days)
      const oldNotifications = await this.prisma.notification.deleteMany({
        where: { read: true, createdAt: { lt: thirtyDaysAgo } },
      });

      // Clean inactive push tokens (already deactivated for 30+ days)
      const stalePushTokens = await this.prisma.pushToken.deleteMany({
        where: { active: false, updatedAt: { lt: thirtyDaysAgo } },
      });

      this.logger.log(
        `DB cleanup: ${expiredTokens.count} tokens, ${expiredVerifications.count} verifications, ` +
        `${expiredResets.count} resets, ${oldAuditLogs.count} audit logs, ` +
        `${oldNotifications.count} notifications, ${stalePushTokens.count} push tokens`,
      );
    } catch (error) {
      this.logger.error('Database cleanup job failed', error);
    }
  }

  // ─── #25: Invite Expiration (every 6 hours) ───
  @Cron('0 */6 * * *')
  async handleInviteExpiration() {
    try {
      const now = new Date();

      const result = await this.prisma.circleInvite.updateMany({
        where: {
          status: 'PENDING',
          expiresAt: { lt: now },
        },
        data: { status: 'EXPIRED' },
      });

      if (result.count > 0) {
        this.logger.log(`Expired ${result.count} pending invites`);
      }
    } catch (error) {
      this.logger.error('Invite expiration job failed', error);
    }
  }

  // ─── #17: Budget Alert Check (daily at 8 AM) ───
  @Cron('0 8 * * *')
  async handleBudgetAlerts() {
    try {
      const budgets = await this.prisma.budget.findMany({
        where: { deletedAt: null },
        include: {
          household: {
            include: {
              members: { where: { leftAt: null }, select: { userId: true } },
            },
          },
        },
      });

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      for (const budget of budgets) {
        // Calculate actual spending for this category this month
        const spending = await this.prisma.expense.aggregate({
          where: {
            householdId: budget.householdId,
            category: budget.category as any,
            date: { gte: startOfMonth, lte: endOfMonth },
            deletedAt: null,
          },
          _sum: { amount: true },
        });

        const spent = Number(spending._sum.amount || 0);
        const limit = Number(budget.limit);
        const percentage = limit > 0 ? (spent / limit) * 100 : 0;

        // Update spent amount
        await this.prisma.budget.update({
          where: { id: budget.id },
          data: { spent },
        }).catch(() => {});

        // Alert at 80% and 100%
        if (percentage >= 100) {
          for (const member of budget.household.members) {
            await this.notifications.create({
              userId: member.userId,
              householdId: budget.householdId,
              title: '🚨 Budget Exceeded',
              body: `${budget.category} budget exceeded! Spent ${spent.toFixed(2)} of ${limit.toFixed(2)}`,
              type: 'SYSTEM',
              icon: '🚨',
              resourceId: budget.id,
              resourceType: 'budget',
            }).catch(() => {});
          }
        } else if (percentage >= 80) {
          for (const member of budget.household.members) {
            await this.notifications.create({
              userId: member.userId,
              householdId: budget.householdId,
              title: '⚠️ Budget Warning',
              body: `${budget.category} at ${percentage.toFixed(0)}% — ${spent.toFixed(2)} of ${limit.toFixed(2)}`,
              type: 'SYSTEM',
              icon: '⚠️',
              resourceId: budget.id,
              resourceType: 'budget',
            }).catch(() => {});
          }
        }
      }
    } catch (error) {
      this.logger.error('Budget alerts job failed', error);
    }
  }

  // ─── #19: Chore Rotation (daily at midnight) ───
  @Cron('0 0 * * *')
  async handleChoreRotation() {
    try {
      const recurringChores = await this.prisma.task.findMany({
        where: {
          isChore: true,
          recurring: { not: null },
          deletedAt: null,
          completed: true,
        },
        include: {
          household: {
            include: {
              members: {
                where: { leftAt: null },
                select: { userId: true },
                orderBy: { joinedAt: 'asc' },
              },
            },
          },
        },
      });

      for (const chore of recurringChores) {
        const members = chore.household.members;
        if (members.length === 0) continue;

        // Rotate to next member
        const currentIdx = members.findIndex(m => m.userId === chore.assignedToId);
        const nextIdx = (currentIdx + 1) % members.length;
        const nextUserId = members[nextIdx].userId;

        // Reset the chore for the next cycle
        await this.prisma.task.update({
          where: { id: chore.id },
          data: {
            completed: false,
            completedAt: null,
            assignedToId: nextUserId,
          },
        });

        await this.notifications.create({
          userId: nextUserId,
          householdId: chore.householdId,
          title: '🔄 Chore Rotation',
          body: `It's your turn: ${chore.title}`,
          type: 'CHORE',
          icon: '🔄',
          resourceId: chore.id,
          resourceType: 'task',
        }).catch(() => {});
      }

      if (recurringChores.length > 0) {
        this.logger.log(`Rotated ${recurringChores.length} chores`);
      }
    } catch (error) {
      this.logger.error('Chore rotation job failed', error);
    }
  }
}
