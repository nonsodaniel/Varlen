import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { VisibilityService } from '../../common/services/visibility.service';
import { ShareItemDto } from './dto/share-item.dto';
import { SharePermission } from '@prisma/client';

const VALID_ENTITY_TYPES = [
  'task',
  'event',
  'list',
  'expense',
  'memory',
  'poll',
  'goal',
  'countdown',
  'routine',
  'meal',
];

interface EntityMeta {
  id: string;
  householdId: string;
  createdById: string;
  visibility: string;
}

@Injectable()
export class SharingService {
  constructor(
    private prisma: PrismaService,
    private visibility: VisibilityService,
  ) {}

  async shareItem(
    entityType: string,
    entityId: string,
    userId: string,
    dto: ShareItemDto,
  ) {
    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      throw new BadRequestException(`Invalid entity type: ${entityType}`);
    }

    if (!dto.circleIds?.length && !dto.userIds?.length) {
      throw new BadRequestException('Must provide at least one circleId or userId to share with');
    }

    // Look up the entity and verify access
    const entity = await this.getEntityMeta(entityType, entityId);
    if (!entity) throw new NotFoundException('Item not found');

    const hasAccess = await this.visibility.canUserAccessEntity(
      userId, entityType, entityId,
      entity.householdId, entity.createdById, entity.visibility,
    );
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this item');
    }

    const permission = dto.permission || SharePermission.VIEW;
    const shares: any[] = [];

    // Share with circles
    if (dto.circleIds?.length) {
      for (const circleId of dto.circleIds) {
        const share = await this.prisma.itemShare.upsert({
          where: {
            entityType_entityId_circleId: { entityType, entityId, circleId },
          },
          create: {
            entityType,
            entityId,
            circleId,
            permission,
            sharedById: userId,
          },
          update: { permission },
        });
        shares.push(share);
      }
    }

    // Share with individual users
    if (dto.userIds?.length) {
      for (const targetUserId of dto.userIds) {
        const share = await this.prisma.itemShare.upsert({
          where: {
            entityType_entityId_userId: { entityType, entityId, userId: targetUserId },
          },
          create: {
            entityType,
            entityId,
            userId: targetUserId,
            permission,
            sharedById: userId,
          },
          update: { permission },
        });
        shares.push(share);
      }
    }

    // Update the entity's visibility to CUSTOM
    await this.setEntityVisibility(entityType, entityId, 'CUSTOM');

    return { shares, count: shares.length };
  }

  async getItemShares(entityType: string, entityId: string, userId: string) {
    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      throw new BadRequestException(`Invalid entity type: ${entityType}`);
    }

    const entity = await this.getEntityMeta(entityType, entityId);
    if (!entity) throw new NotFoundException('Item not found');

    const hasAccess = await this.visibility.canUserAccessEntity(
      userId, entityType, entityId,
      entity.householdId, entity.createdById, entity.visibility,
    );
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this item');
    }

    return this.prisma.itemShare.findMany({
      where: { entityType, entityId },
      include: {
        circle: { select: { id: true, name: true, emoji: true, color: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async removeShare(entityType: string, entityId: string, shareId: string, userId: string) {
    const share = await this.prisma.itemShare.findFirst({
      where: { id: shareId, entityType, entityId },
    });

    if (!share) throw new NotFoundException('Share not found');

    // Only the person who shared or someone with access can remove shares
    if (share.sharedById !== userId) {
      const entity = await this.getEntityMeta(entityType, entityId);
      if (!entity) throw new NotFoundException('Item not found');

      const hasAccess = await this.visibility.canUserAccessEntity(
        userId, entityType, entityId,
        entity.householdId, entity.createdById, entity.visibility,
      );
      if (!hasAccess) {
        throw new ForbiddenException('You do not have permission to remove this share');
      }
    }

    await this.prisma.itemShare.delete({ where: { id: shareId } });

    // If no more shares exist, revert visibility to CIRCLE_ONLY
    const remainingShares = await this.prisma.itemShare.count({
      where: { entityType, entityId },
    });

    if (remainingShares === 0) {
      await this.setEntityVisibility(entityType, entityId, 'CIRCLE_ONLY');
    }

    return { removed: true };
  }

  private async getEntityMeta(entityType: string, entityId: string): Promise<EntityMeta | null> {
    const modelMap: Record<string, { model: string; createdByField: string }> = {
      task: { model: 'task', createdByField: 'createdById' },
      event: { model: 'calendarEvent', createdByField: 'createdById' },
      list: { model: 'shoppingList', createdByField: 'createdById' },
      expense: { model: 'expense', createdByField: 'paidById' },
      memory: { model: 'memory', createdByField: 'createdById' },
      poll: { model: 'poll', createdByField: 'createdById' },
      goal: { model: 'goal', createdByField: 'createdById' },
      countdown: { model: 'countdown', createdByField: 'createdById' },
      routine: { model: 'routine', createdByField: 'createdById' },
      meal: { model: 'meal', createdByField: 'createdById' },
    };

    const config = modelMap[entityType];
    if (!config) return null;

    const record = await (this.prisma as any)[config.model].findUnique({
      where: { id: entityId },
      select: { id: true, householdId: true, [config.createdByField]: true, visibility: true },
    });

    if (!record) return null;

    return {
      id: record.id,
      householdId: record.householdId,
      createdById: record[config.createdByField],
      visibility: record.visibility || 'CIRCLE_ONLY',
    };
  }

  private async setEntityVisibility(entityType: string, entityId: string, visibility: string) {
    const modelMap: Record<string, string> = {
      task: 'task',
      event: 'calendarEvent',
      list: 'shoppingList',
      expense: 'expense',
      memory: 'memory',
      poll: 'poll',
      goal: 'goal',
      countdown: 'countdown',
      routine: 'routine',
      meal: 'meal',
    };

    const model = modelMap[entityType];
    if (!model) return;

    try {
      await (this.prisma as any)[model].update({
        where: { id: entityId },
        data: { visibility },
      });
    } catch {
      // Entity may not have visibility field or may not exist
    }
  }
}
