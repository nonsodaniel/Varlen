import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(householdId: string, dto: CreateBudgetDto, userId?: string) {
    const existing = await this.prisma.budget.findFirst({
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

    const budget = await this.prisma.budget.create({
      data: {
        householdId,
        category: dto.category,
        limit: dto.limit,
        period: dto.period ?? 'monthly',
      },
    });

    if (userId) {
      this.notifyHouseholdMembers(householdId, userId, 'New Budget', `created a budget for ${dto.category}`, 'budget', budget.id).catch(() => {});
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

  private async notifyHouseholdMembers(householdId: string, actorId: string, title: string, action: string, resourceType: string, resourceId: string) {
    const [members, actor] = await Promise.all([
      this.prisma.householdMember.findMany({ where: { householdId, leftAt: null } }),
      this.prisma.user.findUnique({ where: { id: actorId }, select: { name: true } }),
    ]);
    const actorName = actor?.name ?? 'Someone';
    for (const member of members) {
      if (member.userId !== actorId) {
        this.notifications.create({
          userId: member.userId,
          householdId,
          title,
          body: `${actorName} ${action}`,
          type: 'ACTIVITY',
          resourceId,
          resourceType,
        }).catch(() => {});
      }
    }
  }
}
