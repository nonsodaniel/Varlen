import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCountdownDto } from './dto/create-countdown.dto';
import { UpdateCountdownDto } from './dto/update-countdown.dto';

@Injectable()
export class CountdownsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(householdId: string, dto: CreateCountdownDto, userId?: string) {
    const countdown = await this.prisma.countdown.create({
      data: {
        householdId,
        title: dto.title,
        date: new Date(dto.date),
        emoji: dto.emoji ?? '',
        color: dto.color ?? '#6366F1',
      },
    });

    if (userId) {
      this.notifyHouseholdMembers(householdId, userId, 'New Countdown', `created a countdown: "${dto.title}"`, 'countdown', countdown.id).catch(() => {});
    }

    return countdown;
  }

  async findAll(householdId: string) {
    return this.prisma.countdown.findMany({
      where: {
        householdId,
        deletedAt: null,
      },
      orderBy: { date: 'asc' },
    });
  }

  async findById(householdId: string, id: string) {
    const countdown = await this.prisma.countdown.findFirst({
      where: {
        id,
        householdId,
        deletedAt: null,
      },
    });

    if (!countdown) {
      throw new NotFoundException(`Countdown with ID "${id}" not found`);
    }

    return countdown;
  }

  async update(householdId: string, id: string, dto: UpdateCountdownDto) {
    await this.findById(householdId, id);

    const { date, ...rest } = dto;

    return this.prisma.countdown.update({
      where: { id, deletedAt: null },
      data: {
        ...rest,
        ...(date !== undefined && { date: new Date(date) }),
      },
    });
  }

  async delete(householdId: string, id: string) {
    await this.findById(householdId, id);

    return this.prisma.countdown.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  private async notifyHouseholdMembers(householdId: string, actorId: string, title: string, action: string, resourceType: string, resourceId: string) {
    const [members, actor] = await Promise.all([
      this.prisma.householdMember.findMany({ where: { householdId, leftAt: null } }),
      this.prisma.user.findUnique({ where: { id: actorId }, select: { name: true } }),
    ]);
    const actorName = actor?.name ?? 'Someone';
    for (const member of members) {
      if (member.userId !== actorId) {
        this.notifications.create({
          userId: member.userId,
          householdId,
          title,
          body: `${actorName} ${action}`,
          type: 'ACTIVITY',
          resourceId,
          resourceType,
        }).catch(() => {});
      }
    }
  }
}
