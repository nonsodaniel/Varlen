import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  async create(householdId: string, userId: string, dto: CreateEventDto) {
    const event = await this.prisma.calendarEvent.create({
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

    // Notify household members about new shared event
    if (dto.shared !== false) {
      this.prisma.householdMember.findMany({
        where: { householdId, leftAt: null },
        select: { userId: true },
      }).then((members) => {
        const others = members.filter((m) => m.userId !== userId);
        Promise.allSettled(
          others.map((m) =>
            this.notifications.create({
              userId: m.userId,
              householdId,
              title: 'New event',
              body: `"${dto.title}" has been added to the calendar`,
              type: 'EVENT',
              resourceId: event.id,
              resourceType: 'calendar_event',
            }),
          ),
        ).catch((err) => this.logger.warn('notify members on event create failed', err));
      }).catch((err) => this.logger.warn('fetch members for event notify failed', err));
    }

    this.audit.log({ userId, action: 'create', resource: 'calendar_event', resourceId: event.id }).catch((err) => this.logger.warn('audit log event create failed', err));
    this.realtime.emitToHousehold(householdId, 'event:created', event);

    return event;
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
      where: { id, deletedAt: null },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        syncVersion: { increment: 1 },
      },
    });
  }

  async delete(householdId: string, id: string, userId: string) {
    await this.findById(householdId, id);

    const event = await this.prisma.calendarEvent.update({
      where: { id, deletedAt: null },
      data: {
        deletedAt: new Date(),
        syncVersion: { increment: 1 },
      },
    });

    this.audit.log({ userId, action: 'delete', resource: 'calendar_event', resourceId: id }).catch((err) => this.logger.warn('audit log event delete failed', err));
    this.realtime.emitToHousehold(householdId, 'event:deleted', { id });

    return event;
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
