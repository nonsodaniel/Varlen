import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async create(householdId: string, userId: string, dto: CreateEventDto) {
    return this.prisma.calendarEvent.create({
      data: {
        householdId,
        createdById: userId,
        title: dto.title,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        allDay: dto.allDay ?? false,
        color: dto.color ?? '#6366F1',
        location: dto.location,
        shared: dto.shared ?? true,
        recurring: dto.recurring,
        syncVersion: 0,
      },
    });
  }

  async findAll(householdId: string, query: QueryEventsDto) {
    const { page = 1, limit = 20, start, end, shared, createdBy } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      householdId,
      deletedAt: null,
    };

    if (start) {
      where.startDate = { ...where.startDate, gte: new Date(start) };
    }

    if (end) {
      where.endDate = { ...where.endDate, lte: new Date(end) };
    }

    if (shared !== undefined) {
      where.shared = shared;
    }

    if (createdBy) {
      where.createdById = createdBy;
    }

    const [data, total] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where,
        orderBy: { startDate: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.calendarEvent.count({ where }),
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
    const event = await this.prisma.calendarEvent.findFirst({
      where: {
        id,
        householdId,
        deletedAt: null,
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }

    return event;
  }

  async update(householdId: string, id: string, dto: UpdateEventDto) {
    await this.findById(householdId, id);

    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        syncVersion: { increment: 1 },
      },
    });
  }

  async delete(householdId: string, id: string) {
    await this.findById(householdId, id);

    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        syncVersion: { increment: 1 },
      },
    });
  }

  async getEventsForDate(householdId: string, date: string) {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.calendarEvent.findMany({
      where: {
        householdId,
        deletedAt: null,
        startDate: { lte: endOfDay },
        endDate: { gte: startOfDay },
      },
      orderBy: { startDate: 'asc' },
    });
  }
}
