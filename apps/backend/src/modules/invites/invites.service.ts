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
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private realtimeService: RealtimeService,
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
        // Return the existing pending invite instead of throwing so the client
        // can still share the link. This prevents spurious "couldn't deliver"
        // errors when the sender retries or taps again.
        return {
          ...existingInvite,
          circle: await this.prisma.household.findUnique({
            where: { id: circleId },
            select: { id: true, name: true, emoji: true, color: true },
          }),
          inviteLink: `${process.env.APP_URL || 'https://sivena.app'}/join/${existingInvite.token}`,
        };
      }
    }

    // Rate-limit: cap at 20 pending invites per circle per hour to prevent spam
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.prisma.circleInvite.count({
      where: {
        circleId,
        invitedById: userId,
        createdAt: { gt: oneHourAgo },
      },
    });
    if (recentCount >= 20) {
      throw new BadRequestException('Too many invites sent recently. Please wait before sending more.');
    }

    const expiresAt = new Date();
    const inviteExpiryDays = parseInt(process.env.INVITE_EXPIRY_DAYS ?? '7', 10);
    expiresAt.setDate(expiresAt.getDate() + inviteExpiryDays);

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
        circle: { select: { id: true, name: true, emoji: true, color: true, mode: true } },
      },
    });

    // Send in-app notification to the invited user (if they're registered)
    if (resolvedUserId) {
      this.notifyInvitedUser(userId, resolvedUserId, invite.circle.name, invite.token, (invite.circle as any).mode);
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
        circle: { select: { id: true, name: true, emoji: true, color: true, mode: true } },
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

    // Accept: use interactive transaction so the membership check and invite status update
    // are atomic, preventing concurrent accepts from creating duplicate memberships or
    // double-marking the invite as ACCEPTED.
    const result = await this.prisma.$transaction(async (tx) => {
      // Re-read invite status inside the transaction to catch concurrent accepts
      const freshInvite = await tx.circleInvite.findUnique({
        where: { id: invite.id },
        select: { status: true },
      });
      if (!freshInvite || freshInvite.status !== InviteStatus.PENDING) {
        throw new BadRequestException(`Invite has already been ${freshInvite?.status?.toLowerCase() ?? 'used'}`);
      }

      // Check membership inside transaction to prevent TOCTOU race
      const existingMembership = await tx.householdMember.findUnique({
        where: { userId_householdId: { userId, householdId: invite.circleId } },
      });

      await tx.circleInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.ACCEPTED, acceptedAt: new Date() },
      });

      if (existingMembership && !existingMembership.leftAt) {
        return { alreadyMember: true };
      }

      await tx.householdMember.upsert({
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
      });

      return { alreadyMember: false };
    });

    if (result.alreadyMember) {
      return { accepted: true, alreadyMember: true, circle: invite.circle };
    }

    // Notify all existing circle members that someone joined
    await this.notifyCircleMembersOfJoin(userId, invite.circleId, invite.circle.name);

    // Emit realtime event so existing members see the new joiner immediately
    // (fire-and-forget — does not block the API response)
    this.realtimeService.emitToHousehold(invite.circleId, 'household:member_joined', { userId });

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

  async resendInvite(circleId: string, inviteId: string, userId: string) {
    const membership = await this.prisma.householdMember.findUnique({
      where: { userId_householdId: { userId, householdId: circleId } },
    });

    if (!membership || !['OWNER', 'ADMIN', 'PARTNER'].includes(membership.role)) {
      throw new ForbiddenException('You do not have permission to resend invites');
    }

    const invite = await this.prisma.circleInvite.findFirst({
      where: { id: inviteId, circleId },
      include: { circle: { select: { name: true } } },
    });

    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('Can only resend pending invites');
    }

    if (invite.invitedUserId) {
      await this.notifyInvitedUser(userId, invite.invitedUserId, invite.circle.name, invite.token);
    }

    return { resent: true };
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
    circleMode?: string,
  ) {
    try {
      const inviter = await this.prisma.user.findUnique({
        where: { id: inviterId },
        select: { name: true },
      });
      const inviterName = inviter?.name || 'Someone';

      // Use mode-specific invite copy
      const modeBody = this.inviteBody(inviterName, circleName, circleMode);

      await this.notificationsService.create({
        userId: invitedUserId,
        title: "You've been invited!",
        body: modeBody,
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
      // Fetch joining user's name and circle's mode in parallel
      const [newUser, circle] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: newUserId },
          select: { name: true },
        }),
        this.prisma.household.findUnique({
          where: { id: circleId },
          select: { mode: true },
        }),
      ]);

      const memberName = newUser?.name || 'Someone';
      const mode = circle?.mode;

      // Build a mode-aware join message
      let title = 'New member joined';
      let body = `${memberName} joined "${circleName}"`;
      if (mode === 'COUPLE') {
        title = 'Your partner joined';
        body = `${memberName} accepted your invite and joined your couple space`;
      } else if (mode === 'FAMILY') {
        title = 'New family member';
        body = `${memberName} joined your family space`;
      } else if (mode === 'PARENTING') {
        title = 'New co-parent joined';
        body = `${memberName} joined your parenting space`;
      }

      // Get all active members of the circle (excluding the new joiner)
      const members = await this.prisma.householdMember.findMany({
        where: {
          householdId: circleId,
          leftAt: null,
          userId: { not: newUserId },
        },
        select: { userId: true },
      });

      // Send notifications in parallel — use allSettled so one failure doesn't block others
      await Promise.allSettled(
        members.map((member) =>
          this.notificationsService.create({
            userId: member.userId,
            householdId: circleId,
            title,
            body,
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

  /** Returns mode-specific copy for the invite notification sent to the recipient. */
  private inviteBody(inviterName: string, circleName: string, mode?: string): string {
    switch (mode) {
      case 'COUPLE':
        return `${inviterName} wants you to join their couple space — "${circleName}"`;
      case 'FAMILY':
        return `${inviterName} invited you to join your family space — "${circleName}"`;
      case 'PARENTING':
        return `${inviterName} invited you to their parenting space — "${circleName}"`;
      default:
        return `${inviterName} invited you to join "${circleName}"`;
    }
  }

  async getInviteByToken(token: string) {
    const invite = await this.prisma.circleInvite.findUnique({
      where: { token },
      include: {
        circle: { select: { id: true, name: true, emoji: true, color: true, mode: true } },
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
