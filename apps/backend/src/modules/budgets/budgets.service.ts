import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  private readonly logger = new Logger(BudgetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(householdId: string, dto: CreateBudgetDto, userId?: string) {
    // Wrap check + create in a transaction to prevent duplicate budgets
    const budget = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.budget.findFirst({
        where: {
          householdId,
          category: { equals: dto.category, mode: 'insensitive' },
          period: dto.period ?? 'monthly',
          deletedAt: null,
        },
      });

      if (existing) {
        throw new ConflictException(
          `A budget for category "${dto.category}" with period "${dto.period ?? 'monthly'}" already exists`,
        );
      }

      return tx.budget.create({
        data: {
          householdId,
          category: dto.category,
          limit: dto.limit,
          period: dto.period ?? 'monthly',
        },
      });
    });

    if (userId) {
      this.notifyHouseholdMembers(householdId, userId, 'New Budget', `created a budget for ${dto.category}`, 'budget', budget.id).catch((err) => this.logger.warn('notify members on budget create failed', err));
    }

    return budget;
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
      where: { id, deletedAt: null },
      data: { ...dto },
    });
  }

  async delete(householdId: string, id: string) {
    await this.findById(householdId, id);

    return this.prisma.budget.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  private async notifyHouseholdMembers(householdId: string, actorId: string, title: string, action: string, resourceType: string, resourceId: string) {
    const [members, actor] = await Promise.all([
      this.prisma.householdMember.findMany({ where: { householdId, leftAt: null }, select: { userId: true } }),
      this.prisma.user.findUnique({ where: { id: actorId }, select: { name: true } }),
    ]);
    const actorName = actor?.name ?? 'Someone';
    const others = members.filter((m) => m.userId !== actorId);
    await Promise.allSettled(
      others.map((m) =>
        this.notifications.create({ userId: m.userId, householdId, title, body: `${actorName} ${action}`, type: 'ACTIVITY', resourceId, resourceType }),
      ),
    );
  }
}
