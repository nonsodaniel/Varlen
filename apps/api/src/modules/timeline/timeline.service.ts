import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTimelineEntryDto } from './dto/create-timeline-entry.dto';
import { UpdateTimelineEntryDto } from './dto/update-timeline-entry.dto';
import { QueryTimelineDto } from './dto/query-timeline.dto';

@Injectable()
export class TimelineService {
  constructor(private readonly prisma: PrismaService) {}

  async create(householdId: string, userId: string, dto: CreateTimelineEntryDto) {
    return this.prisma.timelineEntry.create({
      data: {
        householdId,
        createdById: userId,
        title: dto.title,
        description: dto.description,
        emoji: dto.emoji,
        date: new Date(dto.date),
        category: dto.category,
      },
    });
  }

  async findAll(householdId: string, query: QueryTimelineDto) {
    const { page = 1, limit = 20, category, from, to } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      householdId,
      deletedAt: null,
    };

    if (category) {
      where.category = category;
    }

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      this.prisma.timelineEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.timelineEntry.count({ where }),
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
    const entry = await this.prisma.timelineEntry.findFirst({
      where: {
        id,
        householdId,
        deletedAt: null,
      },
    });

    if (!entry) {
      throw new NotFoundException(`Timeline entry with ID "${id}" not found`);
    }

    return entry;
  }

  async update(householdId: string, id: string, dto: UpdateTimelineEntryDto) {
    await this.findById(householdId, id);

    const { date, ...rest } = dto;

    return this.prisma.timelineEntry.update({
      where: { id },
      data: {
        ...rest,
        ...(date !== undefined && { date: new Date(date) }),
      },
    });
  }

  async delete(householdId: string, id: string) {
    await this.findById(householdId, id);

    return this.prisma.timelineEntry.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
