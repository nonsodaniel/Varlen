import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { HouseholdRole, InviteStatus } from '@prisma/client';

@Injectable()
export class InvitesService {
  constructor(private prisma: PrismaService) {}

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

    // Must provide at least one target
    if (!dto.userId && !dto.email && !dto.phone) {
      throw new BadRequestException('Must provide userId, email, or phone');
    }

    // Check if target user is already a member
    if (dto.userId) {
      const existing = await this.prisma.householdMember.findUnique({
        where: { userId_householdId: { userId: dto.userId, householdId: circleId } },
      });
      if (existing && !existing.leftAt) {
        throw new BadRequestException('User is already a member of this circle');
      }
    }

    // Check for existing pending invite
    const existingInvite = await this.prisma.circleInvite.findFirst({
      where: {
        circleId,
        status: InviteStatus.PENDING,
        ...(dto.userId ? { invitedUserId: dto.userId } : {}),
        ...(dto.email ? { invitedEmail: dto.email } : {}),
        ...(dto.phone ? { invitedPhone: dto.phone } : {}),
      },
    });

    if (existingInvite) {
      throw new BadRequestException('An invite is already pending for this user');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

    const invite = await this.prisma.circleInvite.create({
      data: {
        circleId,
        invitedById: userId,
        invitedUserId: dto.userId || null,
        invitedEmail: dto.email || null,
        invitedPhone: dto.phone || null,
        role: dto.role || HouseholdRole.MEMBER,
        expiresAt,
      },
      include: {
        circle: { select: { id: true, name: true, emoji: true, color: true } },
      },
    });

    return {
      ...invite,
      inviteLink: `https://sivena.app/join/${invite.token}`,
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
          ...(user.email ? [{ invitedEmail: user.email }] : []),
        ],
      },
      include: {
        circle: { select: { id: true, name: true, emoji: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invites.map((inv) => ({
      ...inv,
      inviteLink: `https://sivena.app/join/${inv.token}`,
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

    // Verify the invite is for this user
    if (invite.invitedUserId && invite.invitedUserId !== userId) {
      throw new ForbiddenException('This invite is not for you');
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
      circle: invite.circle,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
      expired: invite.expiresAt < new Date(),
    };
  }
}
