import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';

@Injectable()
export class RoutinesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(householdId: string, dto: CreateRoutineDto) {
    return this.prisma.routine.create({
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
      where: { id },
      data: { ...dto },
    });
  }

  async toggle(householdId: string, id: string) {
    const routine = await this.findById(householdId, id);

    return this.prisma.routine.update({
      where: { id },
      data: { enabled: !routine.enabled },
    });
  }

  async delete(householdId: string, id: string) {
    await this.findById(householdId, id);

    return this.prisma.routine.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
