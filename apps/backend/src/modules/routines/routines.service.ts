import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';

@Injectable()
export class RoutinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(householdId: string, dto: CreateRoutineDto, userId?: string) {
    const routine = await this.prisma.routine.create({
      data: {
        householdId,
        title: dto.title,
        time: dto.time,
        days: dto.days ?? [],
        assignedToId: dto.assignedToId,
        category: dto.category,
        enabled: dto.enabled ?? true,
      },
    });

    if (userId) {
      this.notifyHouseholdMembers(householdId, userId, 'New Routine', `created a routine: "${dto.title}"`, 'routine', routine.id).catch(() => {});
    }

    return routine;
  }

  async findAll(householdId: string) {
    return this.prisma.routine.findMany({
      where: {
        householdId,
        deletedAt: null,
      },
      orderBy: { time: 'asc' },
    });
  }

  async findById(householdId: string, id: string) {
    const routine = await this.prisma.routine.findFirst({
      where: {
        id,
        householdId,
        deletedAt: null,
      },
    });

    if (!routine) {
      throw new NotFoundException(`Routine with ID "${id}" not found`);
    }

    return routine;
  }

  async update(householdId: string, id: string, dto: UpdateRoutineDto) {
    await this.findById(householdId, id);

    return this.prisma.routine.update({
      where: { id, deletedAt: null },
      data: { ...dto },
    });
  }

  async toggle(householdId: string, id: string) {
    const routine = await this.findById(householdId, id);

    return this.prisma.routine.update({
      where: { id, deletedAt: null },
      data: { enabled: !routine.enabled },
    });
  }

  async delete(householdId: string, id: string) {
    await this.findById(householdId, id);

    return this.prisma.routine.update({
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
