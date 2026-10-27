import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMemoryDto } from './dto/create-memory.dto';
import { UpdateMemoryDto } from './dto/update-memory.dto';
import { QueryMemoriesDto } from './dto/query-memories.dto';

@Injectable()
export class MemoriesService {
  private readonly logger = new Logger(MemoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(householdId: string, userId: string, dto: CreateMemoryDto) {
    const memory = await this.prisma.memory.create({
      data: {
        householdId,
        createdById: userId,
        title: dto.title,
        description: dto.description,
        date: new Date(dto.date),
        type: dto.type ?? 'milestone',
        shared: dto.shared ?? true,
        emoji: dto.emoji,
        imageUrl: dto.imageUrl,
        imageUrls: dto.imageUrls ?? [],
      },
    });

    this.audit.log({ userId, action: 'create', resource: 'memory', resourceId: memory.id }).catch((err) => this.logger.warn('audit log memory create failed', err));
    this.realtime.emitToHousehold(householdId, 'memory:created', memory);
    this.notifyHouseholdMembers(householdId, userId, 'New Memory', `added a memory: "${dto.title}"`, 'memory', memory.id).catch((err) => this.logger.warn('notify members on memory create failed', err));

    return memory;
  }

  async findAll(householdId: string, query: QueryMemoriesDto) {
    const { page = 1, limit = 20, type } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      householdId,
      deletedAt: null,
    };

    if (type) {
      where.type = type;
    }

    const [data, total] = await Promise.all([
      this.prisma.memory.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.memory.count({ where }),
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

  async findById(householdId: string, id: string) {
    const memory = await this.prisma.memory.findFirst({
      where: {
        id,
        householdId,
        deletedAt: null,
      },
    });

    if (!memory) {
      throw new NotFoundException(`Memory with ID "${id}" not found`);
    }

    return memory;
  }

  async update(householdId: string, id: string, dto: UpdateMemoryDto) {
    await this.findById(householdId, id);

    const { date, ...rest } = dto;

    const memory = await this.prisma.memory.update({
      where: { id, deletedAt: null },
      data: {
        ...rest,
        ...(date !== undefined && { date: new Date(date) }),
      },
    });

    this.realtime.emitToHousehold(householdId, 'memory:updated', memory);

    return memory;
  }

  async delete(householdId: string, id: string) {
    await this.findById(householdId, id);

    return this.prisma.memory.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  private async notifyHouseholdMembers(householdId: string, actorId: string, title: string, action: string, resourceType: string, resourceId: string) {
    const [members, actor] = await Promise.all([
      this.prisma.householdMember.findMany({ where: { householdId, leftAt: null }, select: { userId: true } }),
      this.prisma.user.findUnique({ where: { id: actorId }, select: { name: true } }),
    ]);
    const actorName = actor?.name ?? 'Someone';
    const others = members.filter((m) => m.userId !== actorId);
    await Promise.allSettled(
      others.map((m) =>
        this.notifications.create({
          userId: m.userId,
          householdId,
          title,
          body: `${actorName} ${action}`,
          type: 'ACTIVITY',
          resourceId,
          resourceType,
        }),
      ),
    );
  }
}
