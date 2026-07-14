import * as crypto from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HouseholdRole, LifeMode } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';

@Injectable()
export class HouseholdsService {
  private readonly logger = new Logger(HouseholdsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  /**
   * Create a new household and add the creating user as OWNER.
   */
  async create(userId: string, dto: CreateHouseholdDto) {
    return this.prisma.$transaction(async (tx) => {
      const household = await tx.household.create({
        data: {
          name: dto.name,
          mode: dto.mode ?? LifeMode.COUPLE,
        },
      });

      await tx.householdMember.create({
        data: {
          userId,
          householdId: household.id,
          role: HouseholdRole.OWNER,
        },
      });

      return tx.household.findUnique({
        where: { id: household.id },
        include: {
          members: {
            where: { leftAt: null },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                  color: true,
                },
              },
            },
          },
        },
      });
    });
  }

  /**
   * Find a household by ID with all active members and their user info.
   */
  async findById(id: string) {
    const household = await this.prisma.household.findFirst({
      where: { id, deletedAt: null },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                color: true,
              },
            },
          },
        },
      },
    });

    if (!household) {
      throw new NotFoundException('Household not found');
    }

    return household;
  }

  /**
   * Update household details (name, anniversary, togetherSince).
   */
  async update(id: string, dto: UpdateHouseholdDto) {
    await this.findById(id);

    return this.prisma.household.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.anniversary !== undefined && {
          anniversary: new Date(dto.anniversary),
        }),
        ...(dto.togetherSince !== undefined && {
          togetherSince: new Date(dto.togetherSince),
        }),
      },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                color: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Soft delete a household. Only the OWNER can delete.
   */
  async delete(id: string, userId: string) {
    await this.verifyOwner(id, userId);

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.householdMember.updateMany({
        where: { householdId: id, leftAt: null },
        data: { leftAt: now },
      }),
      this.prisma.household.update({
        where: { id },
        data: { deletedAt: now },
      }),
    ]);

    // After transaction, notify members
    const members = await this.prisma.householdMember.findMany({
      where: { householdId: id, userId: { not: userId } },
      select: { userId: true },
    });
    Promise.allSettled(
      members.map((m) =>
        this.notifications.create({
          userId: m.userId,
          householdId: id,
          title: 'Household deleted',
          body: 'Your household has been deleted by the owner',
          type: 'SYSTEM',
          resourceType: 'household',
          resourceId: id,
        }),
      ),
    ).catch((err) => this.logger.warn('notify members on household delete failed', err));
    this.realtime.emitToHousehold(id, 'household:deleted', { householdId: id });

    return { message: 'Household deleted successfully' };
  }

  /**
   * List all active members of a household with user info.
   */
  async getMembers(householdId: string) {
    await this.findById(householdId);

    return this.prisma.householdMember.findMany({
      where: { householdId, leftAt: null },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            color: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  /**
   * Generate a new invite code for the household. Only OWNER can do this.
   */
  async generateInviteCode(householdId: string, userId: string) {
    await this.verifyOwner(householdId, userId);

    const newCode = crypto.randomBytes(16).toString('hex');

    const household = await this.prisma.household.update({
      where: { id: householdId },
      data: { inviteCode: newCode },
      select: { inviteCode: true },
    });

    return { inviteCode: household.inviteCode };
  }

  /**
   * Join a household by invite code. The user is added as PARTNER.
   * Throws if the user is already a member.
   */
  async joinByCode(inviteCode: string, userId: string) {
    const household = await this.prisma.household.findFirst({
      where: { inviteCode, deletedAt: null },
    });

    if (!household) {
      throw new NotFoundException('Invalid invite code or household not found');
    }

    // Use upsert in a transaction to prevent TOCTOU race (duplicate memberships)
    await this.prisma.$transaction(async (tx) => {
      const existingMembership = await tx.householdMember.findUnique({
        where: {
          userId_householdId: { userId, householdId: household.id },
        },
      });

      if (existingMembership && !existingMembership.leftAt) {
        throw new ConflictException('You are already a member of this household');
      }

      if (existingMembership && existingMembership.leftAt) {
        await tx.householdMember.update({
          where: { id: existingMembership.id },
          data: {
            leftAt: null,
            role: HouseholdRole.PARTNER,
            joinedAt: new Date(),
          },
        });
      } else {
        await tx.householdMember.create({
          data: {
            userId,
            householdId: household.id,
            role: HouseholdRole.PARTNER,
          },
        });
      }
    });

    // Notify existing members that someone joined (parallel fetch + send)
    const [members, joiner] = await Promise.all([
      this.prisma.householdMember.findMany({ where: { householdId: household.id, leftAt: null }, select: { userId: true } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    ]);
    const others = members.filter((m) => m.userId !== userId);
    Promise.allSettled(
      others.map((m) =>
        this.notifications.create({
          userId: m.userId,
          householdId: household.id,
          title: 'New member joined',
          body: `${joiner?.name ?? 'Someone'} has joined your household`,
          type: 'ACTIVITY',
          resourceType: 'household',
          resourceId: household.id,
        }),
      ),
    ).catch((err) => this.logger.warn('notify members on join failed', err));

    this.audit.log({
      userId,
      action: 'join',
      resource: 'household',
      resourceId: household.id,
    }).catch((err) => this.logger.warn('audit log household join failed', err));

    this.realtime.emitToHousehold(household.id, 'household:member_joined', { userId });

    return this.findById(household.id);
  }

  /**
   * Remove a member from a household. Only OWNER can remove members.
   * OWNER cannot remove themselves.
   */
  async removeMember(
    householdId: string,
    memberUserId: string,
    requestingUserId: string,
  ) {
    await this.verifyOwner(householdId, requestingUserId);

    if (memberUserId === requestingUserId) {
      throw new BadRequestException(
        'You cannot remove yourself from the household',
      );
    }

    const membership = await this.prisma.householdMember.findUnique({
      where: {
        userId_householdId: { userId: memberUserId, householdId },
      },
    });

    if (!membership || membership.leftAt) {
      throw new NotFoundException('Member not found in this household');
    }

    await this.prisma.householdMember.update({
      where: { id: membership.id },
      data: { leftAt: new Date() },
    });

    // Unassign tasks from departing member
    await this.prisma.task.updateMany({
      where: { householdId, assignedToId: memberUserId, deletedAt: null },
      data: { assignedToId: null },
    });

    this.notifications.create({
      userId: memberUserId,
      householdId,
      title: 'Removed from household',
      body: 'You have been removed from the household',
      type: 'SYSTEM',
      resourceType: 'household',
      resourceId: householdId,
    }).catch((err) => this.logger.warn('notify removed member failed', err));

    this.audit.log({
      userId: requestingUserId,
      action: 'remove_member',
      resource: 'household',
      resourceId: householdId,
      changes: { removedUserId: memberUserId },
    }).catch((err) => this.logger.warn('audit log remove member failed', err));

    this.realtime.emitToHousehold(householdId, 'household:member_removed', { userId: memberUserId });

    return { message: 'Member removed successfully' };
  }

  /**
   * Leave a household. Non-owner members can leave on their own.
   * Owners cannot leave — they must delete the household or transfer ownership.
   */
  async leave(householdId: string, userId: string) {
    const membership = await this.prisma.householdMember.findUnique({
      where: {
        userId_householdId: { userId, householdId },
      },
    });

    if (!membership || membership.leftAt) {
      throw new NotFoundException('You are not a member of this household');
    }

    if (membership.role === HouseholdRole.OWNER) {
      throw new BadRequestException(
        'The owner cannot leave the household. Delete it instead.',
      );
    }

    await this.prisma.householdMember.update({
      where: { id: membership.id },
      data: { leftAt: new Date() },
    });

    // Unassign tasks from departing member
    await this.prisma.task.updateMany({
      where: { householdId, assignedToId: userId, deletedAt: null },
      data: { assignedToId: null },
    });

    const leaver = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Notify remaining members
    this.prisma.householdMember.findMany({
      where: { householdId, leftAt: null },
      select: { userId: true },
    }).then((remaining) => {
      Promise.allSettled(
        remaining.map((m) =>
          this.notifications.create({
            userId: m.userId,
            householdId,
            title: 'Member left',
            body: `${leaver?.name ?? 'Someone'} has left the household`,
            type: 'ACTIVITY',
            resourceType: 'household',
            resourceId: householdId,
          }),
        ),
      );
    }).catch((err) => this.logger.warn('notify members on leave failed', err));

    this.audit
      .log({
        userId,
        action: 'leave',
        resource: 'household',
        resourceId: householdId,
      })
      .catch((err) => this.logger.warn('audit log household leave failed', err));

    this.realtime.emitToHousehold(householdId, 'household:member_left', {
      userId,
    });

    return { message: 'You have left the household' };
  }

  /**
   * Update a member's role. Only OWNER can update roles.
   */
  async updateMemberRole(
    householdId: string,
    memberUserId: string,
    role: HouseholdRole,
    requestingUserId: string,
  ) {
    await this.verifyOwner(householdId, requestingUserId);

    const membership = await this.prisma.householdMember.findUnique({
      where: {
        userId_householdId: { userId: memberUserId, householdId },
      },
    });

    if (!membership || membership.leftAt) {
      throw new NotFoundException('Member not found in this household');
    }

    return this.prisma.householdMember.update({
      where: { id: membership.id },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            color: true,
          },
        },
      },
    });
  }

  /**
   * Change the household's life mode. Only OWNER can change the mode.
   */
  async changeMode(householdId: string, mode: LifeMode, userId: string) {
    await this.verifyOwner(householdId, userId);

    return this.prisma.household.update({
      where: { id: householdId },
      data: { mode },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                color: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get the user's active household (first one where leftAt is null).
   */
  async getUserHousehold(userId: string) {
    const membership = await this.prisma.householdMember.findFirst({
      where: { userId, leftAt: null },
      include: {
        household: {
          include: {
            members: {
              where: { leftAt: null },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                    color: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!membership || membership.household.deletedAt) {
      return null;
    }

    return membership.household;
  }

  /**
   * Verify that a user is the OWNER of a household.
   * Throws ForbiddenException if not.
   */
  private async verifyOwner(householdId: string, userId: string) {
    const membership = await this.prisma.householdMember.findUnique({
      where: {
        userId_householdId: { userId, householdId },
      },
    });

    if (!membership || membership.leftAt) {
      throw new ForbiddenException('You are not a member of this household');
    }

    if (membership.role !== HouseholdRole.OWNER) {
      throw new ForbiddenException(
        'Only the household owner can perform this action',
      );
    }

    return membership;
  }
}
