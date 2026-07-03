import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  async create(householdId: string, userId: string, dto: CreateTaskDto) {
    const task = await this.prisma.task.create({
      data: {
        householdId,
        createdById: userId,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        priority: dto.priority ?? 'MEDIUM',
        assignedToId: dto.assignedTo,
        shared: dto.shared ?? true,
        category: dto.category,
        recurring: dto.recurring,
        isChore: dto.isChore ?? false,
        syncVersion: 0,
      },
    });

    if (dto.assignedTo && dto.assignedTo !== userId) {
      this.notifications.create({
        userId: dto.assignedTo,
        householdId,
        title: 'New task assigned',
        body: `You've been assigned: ${dto.title}`,
        type: 'ACTIVITY',
        resourceId: task.id,
        resourceType: 'task',
      }).catch(() => {});
    }

    this.audit.log({
      userId,
      action: 'create',
      resource: 'task',
      resourceId: task.id,
    }).catch(() => {});

    this.realtime.emitToHousehold(householdId, 'task:created', task);

    return task;
  }

  async findAll(householdId: string, query: QueryTasksDto) {
    const { page = 1, limit = 20, completed, priority, assignedTo, category, isChore } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      householdId,
      deletedAt: null,
    };

    if (completed !== undefined) {
      where.completed = completed;
    }

    if (priority) {
      where.priority = priority;
    }

    if (assignedTo) {
      where.assignedToId = assignedTo;
    }

    if (category) {
      where.category = category;
    }

    if (isChore !== undefined) {
      where.isChore = isChore;
    }

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.task.count({ where }),
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
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        householdId,
        deletedAt: null,
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }

    return task;
  }

  async update(householdId: string, id: string, userId: string, dto: UpdateTaskDto) {
    const existing = await this.findById(householdId, id);

    const { assignedTo, dueDate, ...rest } = dto;

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        ...rest,
        ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
        ...(assignedTo !== undefined && { assignedToId: assignedTo }),
        syncVersion: { increment: 1 },
      },
    });

    if (assignedTo && assignedTo !== existing.assignedToId && assignedTo !== userId) {
      this.notifications.create({
        userId: assignedTo,
        householdId,
        title: 'Task reassigned to you',
        body: `You've been assigned: ${task.title}`,
        type: 'ACTIVITY',
        resourceId: task.id,
        resourceType: 'task',
      }).catch(() => {});
    }

    this.audit.log({
      userId,
      action: 'update',
      resource: 'task',
      resourceId: id,
      changes: dto as any,
    }).catch(() => {});

    this.realtime.emitToHousehold(householdId, 'task:updated', task);

    return task;
  }

  async delete(householdId: string, id: string, userId: string) {
    await this.findById(householdId, id);

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        syncVersion: { increment: 1 },
      },
    });

    this.audit.log({
      userId,
      action: 'delete',
      resource: 'task',
      resourceId: id,
    }).catch(() => {});

    this.realtime.emitToHousehold(householdId, 'task:deleted', { id });

    return task;
  }

  async toggle(householdId: string, id: string, userId: string) {
    const task = await this.findById(householdId, id);
    const completed = !task.completed;

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        completed,
        completedAt: completed ? new Date() : null,
        syncVersion: { increment: 1 },
      },
    });

    if (completed && task.createdById !== userId) {
      this.notifications.create({
        userId: task.createdById,
        householdId,
        title: 'Task completed',
        body: `"${task.title}" has been marked as done`,
        type: 'ACTIVITY',
        resourceId: task.id,
        resourceType: 'task',
      }).catch(() => {});
    }

    this.audit.log({
      userId,
      action: completed ? 'complete' : 'uncomplete',
      resource: 'task',
      resourceId: id,
    }).catch(() => {});

    this.realtime.emitToHousehold(householdId, 'task:updated', updated);

    return updated;
  }

  async assign(householdId: string, id: string, assignedToId: string, userId: string) {
    await this.findById(householdId, id);

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        assignedToId,
        syncVersion: { increment: 1 },
      },
    });

    if (assignedToId !== userId) {
      this.notifications.create({
        userId: assignedToId,
        householdId,
        title: 'Task assigned to you',
        body: `You've been assigned: ${task.title}`,
        type: 'ACTIVITY',
        resourceId: task.id,
        resourceType: 'task',
      }).catch(() => {});
    }

    this.audit.log({
      userId,
      action: 'assign',
      resource: 'task',
      resourceId: id,
      changes: { assignedToId },
    }).catch(() => {});

    this.realtime.emitToHousehold(householdId, 'task:updated', task);

    return task;
  }
}
