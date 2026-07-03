import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMemoryDto } from './dto/create-memory.dto';
import { UpdateMemoryDto } from './dto/update-memory.dto';
import { QueryMemoriesDto } from './dto/query-memories.dto';

@Injectable()
export class MemoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(householdId: string, userId: string, dto: CreateMemoryDto) {
    return this.prisma.memory.create({
      data: {
        householdId,
        createdById: userId,
        title: dto.title,
        description: dto.description,
        date: new Date(dto.date),
        type: dto.type ?? 'milestone',
        shared: dto.shared ?? true,
        emoji: dto.emoji,
      },
    });
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

    return this.prisma.memory.update({
      where: { id },
      data: {
        ...rest,
        ...(date !== undefined && { date: new Date(date) }),
      },
    });
  }

  async delete(householdId: string, id: string) {
    await this.findById(householdId, id);

    return this.prisma.memory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
