import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';
import { QueryJournalDto } from './dto/query-journal.dto';

@Injectable()
export class JournalService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateJournalEntryDto) {
    return this.prisma.journalEntry.create({
      data: {
        createdById: userId,
        date: new Date(dto.date),
        mood: dto.mood,
        gratitude: dto.gratitude,
        note: dto.note,
      },
    });
  }

  async findAll(userId: string, query: QueryJournalDto) {
    const { page = 1, limit = 20, from, to } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      createdById: userId,
      deletedAt: null,
    };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.journalEntry.count({ where }),
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

  async findById(userId: string, id: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: {
        id,
        createdById: userId,
        deletedAt: null,
      },
    });

    if (!entry) {
      throw new NotFoundException(`Journal entry with ID "${id}" not found`);
    }

    return entry;
  }

  async update(userId: string, id: string, dto: UpdateJournalEntryDto) {
    await this.findById(userId, id);

    return this.prisma.journalEntry.update({
      where: { id },
      data: { ...dto },
    });
  }

  async delete(userId: string, id: string) {
    await this.findById(userId, id);

    return this.prisma.journalEntry.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
