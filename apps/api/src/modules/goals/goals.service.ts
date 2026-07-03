import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(householdId: string, userId: string, dto: CreateGoalDto) {
    return this.prisma.goal.create({
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

  async update(householdId: string, id: string, dto: UpdateGoalDto) {
    await this.findById(householdId, id);

    const { deadline, ...rest } = dto;

    return this.prisma.goal.update({
      where: { id },
      data: {
        ...rest,
        ...(deadline !== undefined && { deadline: new Date(deadline) }),
      },
    });
  }

  async delete(householdId: string, id: string) {
    await this.findById(householdId, id);

    return this.prisma.goal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
