import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppSubscriptionPlan, AppSubscriptionStatus } from '@prisma/client';
import { VerifyReceiptDto } from './dto/verify-receipt.dto';

const PRODUCT_TO_PLAN: Record<string, AppSubscriptionPlan> = {
  'sivena_pro_monthly': AppSubscriptionPlan.PRO_MONTHLY,
  'sivena_pro_yearly': AppSubscriptionPlan.PRO_YEARLY,
  'sivena_family_monthly': AppSubscriptionPlan.FAMILY_MONTHLY,
};

const PLAN_TO_ENTITLEMENT: Record<AppSubscriptionPlan, string> = {
  [AppSubscriptionPlan.PRO_MONTHLY]: 'pro',
  [AppSubscriptionPlan.PRO_YEARLY]: 'pro',
  [AppSubscriptionPlan.FAMILY_MONTHLY]: 'family',
};

@Injectable()
export class AppSubscriptionsService {
  private readonly logger = new Logger(AppSubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getStatus(userId: string) {
    // Check for direct subscription first
    const subscription = await this.prisma.appSubscription.findFirst({
      where: {
        userId,
        status: AppSubscriptionStatus.ACTIVE,
        familyOwnerId: null, // Direct subscription, not a family share
      },
      orderBy: { createdAt: 'desc' },
    });

    if (subscription) {
      return {
        isPremium: true,
        plan: subscription.plan,
        entitlement: subscription.entitlement,
        expiresAt: subscription.expiresAt,
        platform: subscription.platform,
        renewalIntent: subscription.renewalIntent,
      };
    }

    // Check if user is a family member (has a record with familyOwnerId set)
    const familyAccess = await this.prisma.appSubscription.findFirst({
      where: {
        userId,
        familyOwnerId: { not: null },
        status: AppSubscriptionStatus.ACTIVE,
        plan: AppSubscriptionPlan.FAMILY_MONTHLY,
      },
    });

    if (familyAccess) {
      return {
        isPremium: true,
        plan: 'family',
        entitlement: 'family',
        expiresAt: familyAccess.expiresAt,
        isFamilyMember: true,
      };
    }

    return {
      isPremium: false,
      plan: null,
      entitlement: 'free',
      expiresAt: null,
    };
  }

  async verifyAndRecord(userId: string, dto: VerifyReceiptDto) {
    const plan = dto.productId ? PRODUCT_TO_PLAN[dto.productId] : null;

    const existing = await this.prisma.appSubscription.findFirst({
      where: { userId, familyOwnerId: null },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      return this.prisma.appSubscription.update({
        where: { id: existing.id },
        data: {
          revenuecatCustomerId: dto.revenuecatCustomerId,
          plan: plan || existing.plan,
          status: AppSubscriptionStatus.ACTIVE,
          platform: dto.platform,
          productId: dto.productId || existing.productId,
          entitlement: plan ? PLAN_TO_ENTITLEMENT[plan] : existing.entitlement,
        },
      });
    }

    return this.prisma.appSubscription.create({
      data: {
        userId,
        revenuecatCustomerId: dto.revenuecatCustomerId,
        plan: plan || AppSubscriptionPlan.PRO_MONTHLY,
        status: AppSubscriptionStatus.ACTIVE,
        platform: dto.platform,
        productId: dto.productId || 'unknown',
        entitlement: plan ? PLAN_TO_ENTITLEMENT[plan] : 'pro',
        originalPurchaseDate: new Date(),
      },
    });
  }

  async handleWebhookEvent(event: any) {
    const eventType = event?.event?.type;
    const appUserId = event?.event?.app_user_id;
    const productId = event?.event?.product_id;
    const expirationDate = event?.event?.expiration_at_ms
      ? new Date(event.event.expiration_at_ms)
      : null;

    if (!appUserId) {
      this.logger.warn('Webhook event missing app_user_id', event);
      return { processed: false, reason: 'missing app_user_id' };
    }

    this.logger.log(`Processing RevenueCat webhook: ${eventType} for ${appUserId}`);

    const user = await this.prisma.user.findUnique({ where: { id: appUserId } });
    if (!user) {
      this.logger.warn(`Webhook: user ${appUserId} not found`);
      return { processed: false, reason: 'user_not_found' };
    }

    const plan = productId ? PRODUCT_TO_PLAN[productId] : null;

    try {
      switch (eventType) {
        case 'INITIAL_PURCHASE':
        case 'RENEWAL':
        case 'PRODUCT_CHANGE': {
          await this.createOrUpdateSubscription(appUserId, {
            revenuecatCustomerId: event?.event?.original_app_user_id,
            plan: plan || AppSubscriptionPlan.PRO_MONTHLY,
            status: AppSubscriptionStatus.ACTIVE,
            platform: event?.event?.store || 'unknown',
            productId: productId || 'unknown',
            entitlement: plan ? PLAN_TO_ENTITLEMENT[plan] : 'pro',
            expiresAt: expirationDate,
            renewalIntent: true,
          });
          break;
        }

        case 'CANCELLATION': {
          await this.updateSubscriptionStatus(appUserId, AppSubscriptionStatus.CANCELED, {
            canceledAt: new Date(),
            renewalIntent: false,
          });
          break;
        }

        case 'EXPIRATION': {
          await this.updateSubscriptionStatus(appUserId, AppSubscriptionStatus.EXPIRED);
          break;
        }

        case 'BILLING_ISSUE': {
          await this.updateSubscriptionStatus(appUserId, AppSubscriptionStatus.BILLING_RETRY);
          break;
        }

        case 'SUBSCRIBER_ALIAS':
        case 'TRANSFER': {
          this.logger.log(`Received ${eventType} for ${appUserId}`);
          break;
        }

        default:
          this.logger.warn(`Unhandled webhook event type: ${eventType}`);
      }
    } catch (err) {
      this.logger.error(`Failed to process webhook ${eventType} for ${appUserId}`, err);
      return { processed: false, reason: 'processing_error' };
    }

    return { processed: true, eventType };
  }

  async shareFamilyPlan(ownerId: string, targetUserId: string) {
    if (ownerId === targetUserId) {
      throw new BadRequestException('Cannot share a family plan with yourself');
    }

    const ownerSub = await this.prisma.appSubscription.findFirst({
      where: {
        userId: ownerId,
        status: AppSubscriptionStatus.ACTIVE,
        plan: AppSubscriptionPlan.FAMILY_MONTHLY,
        familyOwnerId: null,
      },
    });

    if (!ownerSub) {
      throw new BadRequestException('You do not have an active family plan');
    }

    // Check if target already has family access from this owner
    const existingShare = await this.prisma.appSubscription.findFirst({
      where: {
        userId: targetUserId,
        familyOwnerId: ownerId,
        status: AppSubscriptionStatus.ACTIVE,
      },
    });

    if (existingShare) {
      throw new BadRequestException('This user already has access to your family plan');
    }

    const existingShares = await this.prisma.appSubscription.count({
      where: {
        familyOwnerId: ownerId,
        status: AppSubscriptionStatus.ACTIVE,
      },
    });

    if (existingShares >= 5) {
      throw new BadRequestException('Family plan supports up to 6 members (including owner)');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.appSubscription.create({
      data: {
        userId: targetUserId,
        familyOwnerId: ownerId,
        plan: AppSubscriptionPlan.FAMILY_MONTHLY,
        status: AppSubscriptionStatus.ACTIVE,
        platform: ownerSub.platform,
        productId: ownerSub.productId,
        entitlement: 'family',
        expiresAt: ownerSub.expiresAt,
      },
    });
  }

  async getFamilyMembers(ownerId: string) {
    const members = await this.prisma.appSubscription.findMany({
      where: {
        familyOwnerId: ownerId,
        status: AppSubscriptionStatus.ACTIVE,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    return members.map((m) => m.user);
  }

  private async createOrUpdateSubscription(
    userId: string,
    data: {
      revenuecatCustomerId?: string;
      plan: AppSubscriptionPlan;
      status: AppSubscriptionStatus;
      platform: string;
      productId: string;
      entitlement: string;
      expiresAt?: Date | null;
      renewalIntent?: boolean;
    },
  ) {
    const existing = await this.prisma.appSubscription.findFirst({
      where: { userId, familyOwnerId: null },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      return this.prisma.appSubscription.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.appSubscription.create({
      data: {
        userId,
        originalPurchaseDate: new Date(),
        ...data,
      },
    });
  }

  private async updateSubscriptionStatus(
    userId: string,
    status: AppSubscriptionStatus,
    extra?: Record<string, any>,
  ) {
    const existing = await this.prisma.appSubscription.findFirst({
      where: { userId, status: AppSubscriptionStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      await this.prisma.appSubscription.update({
        where: { id: existing.id },
        data: { status, ...extra },
      });
    } else {
      this.logger.warn(`No active subscription found for user ${userId} to update to ${status}`);
    }
  }
}
