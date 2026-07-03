import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCountdownDto } from './dto/create-countdown.dto';
import { UpdateCountdownDto } from './dto/update-countdown.dto';

@Injectable()
export class CountdownsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(householdId: string, dto: CreateCountdownDto) {
    return this.prisma.countdown.create({
      data: {
        householdId,
        title: dto.title,
        date: new Date(dto.date),
        emoji: dto.emoji,
        color: dto.color,
      },
    });
  }

  async findAll(householdId: string) {
    return this.prisma.countdown.findMany({
      where: {
        householdId,
        deletedAt: null,
      },
      orderBy: { date: 'asc' },
    });
  }

  async findById(householdId: string, id: string) {
    const countdown = await this.prisma.countdown.findFirst({
      where: {
        id,
        householdId,
        deletedAt: null,
      },
    });

    if (!countdown) {
      throw new NotFoundException(`Countdown with ID "${id}" not found`);
    }

    return countdown;
  }

  async update(householdId: string, id: string, dto: UpdateCountdownDto) {
    await this.findById(householdId, id);

    const { date, ...rest } = dto;

    return this.prisma.countdown.update({
      where: { id },
      data: {
        ...rest,
        ...(date !== undefined && { date: new Date(date) }),
      },
    });
  }

  async delete(householdId: string, id: string) {
    await this.findById(householdId, id);

    return this.prisma.countdown.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
