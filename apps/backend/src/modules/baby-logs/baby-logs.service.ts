import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBabyLogDto } from './dto/create-baby-log.dto';
import { UpdateBabyLogDto } from './dto/update-baby-log.dto';
import { QueryBabyLogsDto } from './dto/query-baby-logs.dto';

@Injectable()
export class BabyLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async verifyChild(householdId: string, childId: string) {
    const child = await this.prisma.child.findFirst({
      where: {
        id: childId,
        householdId,
        deletedAt: null,
      },
    });

    if (!child) {
      throw new NotFoundException(`Child with ID "${childId}" not found in this household`);
    }

    return child;
  }

  async create(householdId: string, childId: string, dto: CreateBabyLogDto, userId?: string) {
    const child = await this.verifyChild(householdId, childId);

    const log = await this.prisma.babyLog.create({
      data: {
        childId,
        type: dto.type,
        timestamp: new Date(dto.timestamp),
        duration: dto.duration,
        note: dto.note,
      },
    });

    if (userId) {
      this.notifyHouseholdMembers(householdId, userId, 'Baby Log', `logged ${dto.type} for ${child.name}`, 'baby_log', log.id).catch(() => {});
    }

    return log;
  }

  async findAll(householdId: string, childId: string, query: QueryBabyLogsDto) {
    await this.verifyChild(householdId, childId);

    const { page = 1, limit = 20, type, from, to } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      childId,
      deletedAt: null,
    };

    if (type) {
      where.type = type;
    }

    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      this.prisma.babyLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.babyLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(householdId: string, childId: string, id: string) {
    await this.verifyChild(householdId, childId);

    const log = await this.prisma.babyLog.findFirst({
      where: {
        id,
        childId,
        deletedAt: null,
      },
    });

    if (!log) {
      throw new NotFoundException(`Baby log with ID "${id}" not found`);
    }

    return log;
  }

  async update(householdId: string, childId: string, id: string, dto: UpdateBabyLogDto) {
    await this.findById(householdId, childId, id);

    const { timestamp, ...rest } = dto;

    return this.prisma.babyLog.update({
      where: { id },
      data: {
        ...rest,
        ...(timestamp !== undefined && { timestamp: new Date(timestamp) }),
      },
    });
  }

  async delete(householdId: string, childId: string, id: string) {
    await this.findById(householdId, childId, id);

    return this.prisma.babyLog.update({
      where: { id },
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
