import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class VisibilityService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all circle IDs a user belongs to (active membership only)
   */
  async getUserCircleIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.householdMember.findMany({
      where: { userId, leftAt: null },
      select: { householdId: true },
    });
    return memberships.map((m) => m.householdId);
  }

  /**
   * Build a Prisma WHERE clause for filtering entities by visibility.
   * Returns a filter that includes items the user can see based on:
   * - CIRCLE_ONLY: items in circles the user belongs to
   * - PRIVATE: only items created by the user
   * - CUSTOM: items explicitly shared to user's circles or directly to user
   */
  async buildVisibilityFilter(userId: string, entityType: string) {
    const circleIds = await this.getUserCircleIds(userId);

    // Get entity IDs that are shared to this user via ItemShare
    const shares = await this.prisma.itemShare.findMany({
      where: {
        entityType,
        OR: [{ userId }, { circleId: { in: circleIds } }],
      },
      select: { entityId: true },
    });
    const sharedEntityIds = [...new Set(shares.map((s) => s.entityId))];

    return {
      AND: [
        { deletedAt: null },
        {
          OR: [
            // Items in user's circles with CIRCLE_ONLY visibility
            {
              householdId: { in: circleIds },
              visibility: 'CIRCLE_ONLY' as const,
            },
            // Private items created by this user
            {
              createdById: userId,
              visibility: 'PRIVATE' as const,
            },
            // Items with CUSTOM visibility that are shared to this user
            ...(sharedEntityIds.length > 0
              ? [
                  {
                    id: { in: sharedEntityIds },
                    visibility: 'CUSTOM' as const,
                  },
                ]
              : []),
          ],
        },
      ],
    };
  }

  /**
   * Check if a user can access a specific entity.
   * Used for single-item access checks (GET by ID, UPDATE, DELETE).
   */
  async canUserAccessEntity(
    userId: string,
    entityType: string,
    entityId: string,
    householdId: string,
    createdById: string,
    visibility: string,
  ): Promise<boolean> {
    // Private items: only creator can access
    if (visibility === 'PRIVATE') {
      return createdById === userId;
    }

    // Circle-only: user must be a member of the circle
    if (visibility === 'CIRCLE_ONLY') {
      const membership = await this.prisma.householdMember.findUnique({
        where: {
          userId_householdId: { userId, householdId },
        },
      });
      return !!membership && !membership.leftAt;
    }

    // Custom: user must be in the home circle OR in a shared circle OR directly shared
    if (visibility === 'CUSTOM') {
      // Check home circle membership
      const membership = await this.prisma.householdMember.findUnique({
        where: {
          userId_householdId: { userId, householdId },
        },
      });
      if (membership && !membership.leftAt) return true;

      // Check if shared directly to this user
      const directShare = await this.prisma.itemShare.findFirst({
        where: { entityType, entityId, userId },
      });
      if (directShare) return true;

      // Check if shared to any circle the user belongs to
      const circleIds = await this.getUserCircleIds(userId);
      const circleShare = await this.prisma.itemShare.findFirst({
        where: {
          entityType,
          entityId,
          circleId: { in: circleIds },
        },
      });
      return !!circleShare;
    }

    return false;
  }

  /**
   * Get the permission level a user has for a shared entity.
   * Returns the highest permission if shared through multiple paths.
   */
  async getUserPermission(
    userId: string,
    entityType: string,
    entityId: string,
    householdId: string,
    createdById: string,
  ): Promise<'ADMIN' | 'EDIT' | 'COMMENT' | 'VIEW' | null> {
    // Creator always has ADMIN
    if (createdById === userId) return 'ADMIN';

    // Home circle member has EDIT
    const membership = await this.prisma.householdMember.findUnique({
      where: {
        userId_householdId: { userId, householdId },
      },
    });
    if (membership && !membership.leftAt) return 'EDIT';

    // Check shares for permission level
    const circleIds = await this.getUserCircleIds(userId);
    const shares = await this.prisma.itemShare.findMany({
      where: {
        entityType,
        entityId,
        OR: [{ userId }, { circleId: { in: circleIds } }],
      },
      select: { permission: true },
    });

    if (shares.length === 0) return null;

    // Return highest permission
    const permissionOrder = ['ADMIN', 'EDIT', 'COMMENT', 'VIEW'] as const;
    for (const perm of permissionOrder) {
      if (shares.some((s) => s.permission === perm)) return perm;
    }

    return 'VIEW';
  }
}
