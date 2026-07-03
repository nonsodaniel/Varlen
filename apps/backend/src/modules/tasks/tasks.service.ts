import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(householdId: string, userId: string, dto: CreateTaskDto) {
    return this.prisma.task.create({
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

  async update(householdId: string, id: string, dto: UpdateTaskDto) {
    await this.findById(householdId, id);

    const { assignedTo, dueDate, ...rest } = dto;

    return this.prisma.task.update({
      where: { id },
      data: {
        ...rest,
        ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
        ...(assignedTo !== undefined && { assignedToId: assignedTo }),
        syncVersion: { increment: 1 },
      },
    });
  }

  async delete(householdId: string, id: string) {
    await this.findById(householdId, id);

    return this.prisma.task.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        syncVersion: { increment: 1 },
      },
    });
  }

  async toggle(householdId: string, id: string) {
    const task = await this.findById(householdId, id);
    const completed = !task.completed;

    return this.prisma.task.update({
      where: { id },
      data: {
        completed,
        completedAt: completed ? new Date() : null,
        syncVersion: { increment: 1 },
      },
    });
  }

  async assign(householdId: string, id: string, assignedToId: string) {
    await this.findById(householdId, id);

    return this.prisma.task.update({
      where: { id },
      data: {
        assignedToId,
        syncVersion: { increment: 1 },
      },
    });
  }
}
