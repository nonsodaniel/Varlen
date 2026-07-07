import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateWellnessEntryDto } from './dto/create-wellness-entry.dto';
import { UpdateWellnessEntryDto } from './dto/update-wellness-entry.dto';
import { QueryWellnessDto } from './dto/query-wellness.dto';

@Injectable()
export class WellnessService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateWellnessEntryDto) {
    const date = new Date(dto.date);

    // Wrap check + create in transaction to prevent duplicate entries
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.wellnessEntry.findUnique({
        where: {
          createdById_date: { createdById: userId, date },
        },
      });

      if (existing) {
        throw new ConflictException('A wellness entry already exists for this date');
      }

      return tx.wellnessEntry.create({
        data: {
          createdById: userId,
          date,
          mood: dto.mood,
          sleep: dto.sleep,
          water: dto.water,
          exercise: dto.exercise ?? false,
          note: dto.note,
        },
      });
    });
  }

  async findAll(userId: string, query: QueryWellnessDto) {
    const { page = 1, limit = 20, from, to } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      createdById: userId,
    };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      this.prisma.wellnessEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.wellnessEntry.count({ where }),
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
    const entry = await this.prisma.wellnessEntry.findFirst({
      where: {
        id,
        createdById: userId,
      },
    });

    if (!entry) {
      throw new NotFoundException(`Wellness entry with ID "${id}" not found`);
    }

    return entry;
  }

  async update(userId: string, id: string, dto: UpdateWellnessEntryDto) {
    await this.findById(userId, id);

    return this.prisma.wellnessEntry.update({
      where: { id },
      data: { ...dto },
    });
  }

  async delete(userId: string, id: string) {
    await this.findById(userId, id);

    return this.prisma.wellnessEntry.delete({
      where: { id },
    });
  }
}
