import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(householdId: string, dto: CreateBudgetDto) {
    const existing = await this.prisma.budget.findFirst({
      where: {
        householdId,
        category: dto.category,
        period: dto.period ?? 'monthly',
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(
        `A budget for category "${dto.category}" with period "${dto.period ?? 'monthly'}" already exists`,
      );
    }

    return this.prisma.budget.create({
      data: {
        householdId,
        category: dto.category,
        limit: dto.limit,
        period: dto.period ?? 'monthly',
      },
    });
  }

  async findAll(householdId: string) {
    return this.prisma.budget.findMany({
      where: {
        householdId,
        deletedAt: null,
      },
      orderBy: { category: 'asc' },
    });
  }

  async findById(householdId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: {
        id,
        householdId,
        deletedAt: null,
      },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID "${id}" not found`);
    }

    return budget;
  }

  async update(householdId: string, id: string, dto: UpdateBudgetDto) {
    await this.findById(householdId, id);

    return this.prisma.budget.update({
      where: { id },
      data: { ...dto },
    });
  }

  async delete(householdId: string, id: string) {
    await this.findById(householdId, id);

    return this.prisma.budget.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
