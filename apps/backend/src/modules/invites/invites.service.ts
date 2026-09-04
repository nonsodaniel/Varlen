import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { HouseholdRole, InviteStatus, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async createInvite(circleId: string, userId: string, dto: CreateInviteDto) {
    // Verify the user is a member of the circle with permission to invite
    const membership = await this.prisma.householdMember.findUnique({
      where: { userId_householdId: { userId, householdId: circleId } },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this circle');
    }

    if (!['OWNER', 'ADMIN', 'PARTNER'].includes(membership.role)) {
      throw new ForbiddenException('You do not have permission to invite members');
    }

    // Self-invite prevention
    if (dto.email) {
      const inviter = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (inviter && inviter.email.toLowerCase() === dto.email.toLowerCase()) {
        throw new BadRequestException('You cannot invite yourself');
      }
    }

    // Resolve email to userId if the email belongs to a registered user
    let resolvedUserId = dto.userId || null;
    if (dto.email && !resolvedUserId) {
      const targetUser = await this.prisma.user.findFirst({
        where: { email: dto.email.toLowerCase() },
        select: { id: true },
      });
      if (targetUser) {
        resolvedUserId = targetUser.id;
      }
    }

    const isTargeted = !!(resolvedUserId || dto.email || dto.phone);

    // Check if target user is already a member
    if (resolvedUserId) {
      if (resolvedUserId === userId) {
        throw new BadRequestException('You cannot invite yourself');
      }
      const existing = await this.prisma.householdMember.findUnique({
        where: { userId_householdId: { userId: resolvedUserId, householdId: circleId } },
      });
      if (existing && !existing.leftAt) {
        throw new BadRequestException('User is already a member of this circle');
      }
    }

    // Check for existing pending invite (only for targeted invites)
    if (isTargeted) {
      const existingInvite = await this.prisma.circleInvite.findFirst({
        where: {
          circleId,
          status: InviteStatus.PENDING,
          ...(resolvedUserId ? { invitedUserId: resolvedUserId } : {}),
          ...(dto.email && !resolvedUserId ? { invitedEmail: dto.email.toLowerCase() } : {}),
          ...(dto.phone ? { invitedPhone: dto.phone } : {}),
        },
      });

      if (existingInvite) {
        throw new BadRequestException('An invite is already pending for this user');
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

    const invite = await this.prisma.circleInvite.create({
      data: {
        circleId,
        invitedById: userId,
        token: crypto.randomBytes(32).toString('hex'),
        invitedUserId: resolvedUserId,
        invitedEmail: dto.email?.toLowerCase() || null,
        invitedPhone: dto.phone || null,
        role: dto.role || HouseholdRole.MEMBER,
        expiresAt,
      },
      include: {
        circle: { select: { id: true, name: true, emoji: true, color: true } },
      },
    });

    // Send in-app notification to the invited user (if they're registered)
    if (resolvedUserId) {
      this.notifyInvitedUser(userId, resolvedUserId, invite.circle.name, invite.token);
    }

    return {
      ...invite,
      inviteLink: `${process.env.APP_URL || 'https://sivena.app'}/join/${invite.token}`,
    };
  }

  async getIncomingInvites(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const invites = await this.prisma.circleInvite.findMany({
      where: {
        status: InviteStatus.PENDING,
        expiresAt: { gt: new Date() },
        OR: [
          { invitedUserId: userId },
          ...(user.email ? [{ invitedEmail: user.email.toLowerCase() }] : []),
        ],
      },
      include: {
        circle: { select: { id: true, name: true, emoji: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invites.map((inv) => ({
      ...inv,
      inviteLink: `${process.env.APP_URL || 'https://sivena.app'}/join/${inv.token}`,
    }));
  }

  async getCircleInvites(circleId: string, userId: string) {
    const membership = await this.prisma.householdMember.findUnique({
      where: { userId_householdId: { userId, householdId: circleId } },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this circle');
    }

    return this.prisma.circleInvite.findMany({
      where: { circleId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.circleInvite.findUnique({
      where: { token },
      include: {
        circle: { select: { id: true, name: true, emoji: true, color: true } },
      },
    });

    if (!invite) throw new NotFoundException('Invite not found');

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException(`Invite has already been ${invite.status.toLowerCase()}`);
    }

    if (invite.expiresAt < new Date()) {
      await this.prisma.circleInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.EXPIRED },
      });
      throw new BadRequestException('Invite has expired');
    }

    // Verify the invite is for this user (if targeted)
    if (invite.invitedUserId && invite.invitedUserId !== userId) {
      throw new ForbiddenException('This invite is not for you');
    }

    // Check if user is already a member
    const existingMembership = await this.prisma.householdMember.findUnique({
      where: { userId_householdId: { userId, householdId: invite.circleId } },
    });

    if (existingMembership && !existingMembership.leftAt) {
      // Already a member — mark invite as accepted and return success
      await this.prisma.circleInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.ACCEPTED, acceptedAt: new Date() },
      });
      return { accepted: true, alreadyMember: true, circle: invite.circle };
    }

    // Accept: create membership + update invite status
    await this.prisma.$transaction([
      this.prisma.householdMember.upsert({
        where: { userId_householdId: { userId, householdId: invite.circleId } },
        create: {
          userId,
          householdId: invite.circleId,
          role: invite.role,
        },
        update: {
          role: invite.role,
          leftAt: null,
        },
      }),
      this.prisma.circleInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.ACCEPTED, acceptedAt: new Date() },
      }),
    ]);

    // Notify all existing circle members that someone joined
    await this.notifyCircleMembersOfJoin(userId, invite.circleId, invite.circle.name);

    return { accepted: true, circle: invite.circle };
  }

  async declineInvite(token: string, userId: string) {
    const invite = await this.prisma.circleInvite.findUnique({
      where: { token },
    });

    if (!invite) throw new NotFoundException('Invite not found');

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException(`Invite has already been ${invite.status.toLowerCase()}`);
    }

    // Verify the invite is for this user (targeted) or targeted by email
    if (invite.invitedUserId && invite.invitedUserId !== userId) {
      throw new ForbiddenException('This invite is not for you');
    }

    // For open (non-targeted) link invites, only decline from notification inbox — don't mark the whole invite as declined
    // so other recipients can still use the link. Just return success.
    if (!invite.invitedUserId && !invite.invitedEmail) {
      return { declined: true };
    }

    await this.prisma.circleInvite.update({
      where: { id: invite.id },
      data: { status: InviteStatus.DECLINED },
    });

    return { declined: true };
  }

  async revokeInvite(circleId: string, inviteId: string, userId: string) {
    const membership = await this.prisma.householdMember.findUnique({
      where: { userId_householdId: { userId, householdId: circleId } },
    });

    if (!membership || !['OWNER', 'ADMIN', 'PARTNER'].includes(membership.role)) {
      throw new ForbiddenException('You do not have permission to revoke invites');
    }

    const invite = await this.prisma.circleInvite.findFirst({
      where: { id: inviteId, circleId },
    });

    if (!invite) throw new NotFoundException('Invite not found');

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('Can only revoke pending invites');
    }

    await this.prisma.circleInvite.update({
      where: { id: invite.id },
      data: { status: InviteStatus.REVOKED },
    });

    return { revoked: true };
  }

  private async notifyInvitedUser(
    inviterId: string,
    invitedUserId: string,
    circleName: string,
    token: string,
  ) {
    try {
      const inviter = await this.prisma.user.findUnique({
        where: { id: inviterId },
        select: { name: true },
      });
      const inviterName = inviter?.name || 'Someone';

      await this.notificationsService.create({
        userId: invitedUserId,
        title: "You've been invited!",
        body: `${inviterName} invited you to join "${circleName}"`,
        type: NotificationType.ACTIVITY,
        icon: 'mail-outline',
        resourceId: token,
        resourceType: 'invite',
      });
    } catch (error) {
      // Don't fail invite creation if notification fails
      this.logger.warn('Failed to notify invited user', error);
    }
  }

  private async notifyCircleMembersOfJoin(
    newUserId: string,
    circleId: string,
    circleName: string,
  ) {
    try {
      // Get the joining user's name
      const newUser = await this.prisma.user.findUnique({
        where: { id: newUserId },
        select: { name: true },
      });

      const memberName = newUser?.name || 'Someone';

      // Get all active members of the circle (excluding the new joiner)
      const members = await this.prisma.householdMember.findMany({
        where: {
          householdId: circleId,
          leftAt: null,
          userId: { not: newUserId },
        },
        select: { userId: true },
      });

      // Send a notification to each existing member
      await Promise.all(
        members.map((member) =>
          this.notificationsService.create({
            userId: member.userId,
            householdId: circleId,
            title: 'New member joined',
            body: `${memberName} just joined "${circleName}"`,
            type: NotificationType.ACTIVITY,
            icon: 'person-add-outline',
            resourceId: circleId,
            resourceType: 'circle',
          }),
        ),
      );
    } catch (error) {
      // Don't fail the invite acceptance if notifications fail
      this.logger.warn('Failed to send join notifications', error);
    }
  }

  async getInviteByToken(token: string) {
    const invite = await this.prisma.circleInvite.findUnique({
      where: { token },
      include: {
        circle: { select: { id: true, name: true, emoji: true, color: true } },
      },
    });

    if (!invite) throw new NotFoundException('Invite not found');

    return {
      id: invite.id,
      token: invite.token,
      circle: invite.circle,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
      expired: invite.expiresAt < new Date(),
    };
  }
}
