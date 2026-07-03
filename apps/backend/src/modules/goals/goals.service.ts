import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  async create(householdId: string, userId: string, dto: CreateGoalDto) {
    const goal = await this.prisma.goal.create({
      data: {
        householdId,
        createdById: userId,
        title: dto.title,
        target: dto.target,
        unit: dto.unit,
        deadline: new Date(dto.deadline),
        color: dto.color,
      },
    });

    this.audit.log({ userId, action: 'create', resource: 'goal', resourceId: goal.id }).catch(() => {});
    this.realtime.emitToHousehold(householdId, 'goal:created', goal);

    return goal;
  }

  async findAll(householdId: string) {
    return this.prisma.goal.findMany({
      where: {
        householdId,
        deletedAt: null,
      },
      orderBy: { deadline: 'asc' },
    });
  }

  async findById(householdId: string, id: string) {
    const goal = await this.prisma.goal.findFirst({
      where: {
        id,
        householdId,
        deletedAt: null,
      },
    });

    if (!goal) {
      throw new NotFoundException(`Goal with ID "${id}" not found`);
    }

    return goal;
  }

  async update(householdId: string, id: string, userId: string, dto: UpdateGoalDto) {
    await this.findById(householdId, id);

    const { deadline, ...rest } = dto;

    const goal = await this.prisma.goal.update({
      where: { id },
      data: {
        ...rest,
        ...(deadline !== undefined && { deadline: new Date(deadline) }),
      },
    });

    this.audit.log({ userId, action: 'update', resource: 'goal', resourceId: id, changes: dto as any }).catch(() => {});
    this.realtime.emitToHousehold(householdId, 'goal:updated', goal);

    return goal;
  }

  async delete(householdId: string, id: string, userId: string) {
    await this.findById(householdId, id);

    const goal = await this.prisma.goal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.audit.log({ userId, action: 'delete', resource: 'goal', resourceId: id }).catch(() => {});
    this.realtime.emitToHousehold(householdId, 'goal:deleted', { id });

    return goal;
  }
}
