import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  async create(householdId: string, userId: string, dto: CreateExpenseDto) {
    // Validate split users are household members
    if (dto.splits?.length) {
      const memberIds = await this.prisma.householdMember.findMany({
        where: { householdId, leftAt: null },
        select: { userId: true },
      });
      const validIds = new Set(memberIds.map((m) => m.userId));
      for (const split of dto.splits) {
        if (!validIds.has(split.userId)) {
          throw new BadRequestException(`User ${split.userId} is not a member of this household`);
        }
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          householdId,
          paidById: userId,
          title: dto.title,
          amount: dto.amount,
          category: dto.category,
          date: new Date(dto.date),
          syncVersion: 0,
        },
      });

      if (dto.splits && dto.splits.length > 0) {
        await tx.expenseSplit.createMany({
          data: dto.splits.map((split) => ({
            expenseId: expense.id,
            userId: split.userId,
            amount: split.amount,
          })),
        });
      }

      return tx.expense.findUnique({
        where: { id: expense.id },
        include: {
          splits: { include: { user: { select: { id: true, name: true, color: true } } } },
          paidBy: { select: { id: true, name: true, color: true } },
        },
      });
    });

    if (result && dto.splits) {
      for (const split of dto.splits) {
        if (split.userId !== userId) {
          this.notifications.create({
            userId: split.userId,
            householdId,
            title: 'New expense added',
            body: `${dto.title} — you owe ${split.amount}`,
            type: 'ACTIVITY',
            resourceId: result.id,
            resourceType: 'expense',
          }).catch((err) => this.logger.warn('notify split user on create failed', err));
        }
      }
    }

    this.audit.log({
      userId,
      action: 'create',
      resource: 'expense',
      resourceId: result!.id,
    }).catch((err) => this.logger.warn('audit log expense create failed', err));

    this.realtime.emitToHousehold(householdId, 'expense:created', result);

    return result;
  }

  async findAll(householdId: string, query: QueryExpensesDto) {
    const { page = 1, limit = 20, category, paidBy, settled, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      householdId,
      deletedAt: null,
    };

    if (category) where.category = category;
    if (paidBy) where.paidById = paidBy;
    if (settled !== undefined) where.settled = settled;
    if (startDate) where.date = { ...where.date, gte: new Date(startDate) };
    if (endDate) where.date = { ...where.date, lte: new Date(endDate) };

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: {
          splits: { include: { user: { select: { id: true, name: true, color: true } } } },
          paidBy: { select: { id: true, name: true, color: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(householdId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, householdId, deletedAt: null },
      include: {
        splits: { include: { user: { select: { id: true, name: true, color: true } } } },
        paidBy: { select: { id: true, name: true, color: true } },
      },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID "${id}" not found`);
    }

    return expense;
  }

  async update(householdId: string, id: string, dto: UpdateExpenseDto) {
    await this.findById(householdId, id);

    // Destructure to exclude fields that shouldn't be updatable via this endpoint
    const { splits, paidById, householdId: _hid, ...safeFields } = dto as any;

    return this.prisma.expense.update({
      where: { id, deletedAt: null },
      data: {
        ...safeFields,
        date: dto.date ? new Date(dto.date) : undefined,
        syncVersion: { increment: 1 },
      },
      include: {
        splits: { include: { user: { select: { id: true, name: true, color: true } } } },
        paidBy: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async delete(householdId: string, id: string, userId: string) {
    await this.findById(householdId, id);

    const expense = await this.prisma.expense.update({
      where: { id, deletedAt: null },
      data: {
        deletedAt: new Date(),
        syncVersion: { increment: 1 },
      },
    });

    this.audit.log({ userId, action: 'delete', resource: 'expense', resourceId: id }).catch((err) => this.logger.warn('audit log expense delete failed', err));
    this.realtime.emitToHousehold(householdId, 'expense:deleted', { id });

    return expense;
  }

  async settle(householdId: string, id: string, userId: string) {
    const existing = await this.findById(householdId, id);

    if (existing.settled) {
      throw new BadRequestException('This expense has already been settled');
    }

    const expense = await this.prisma.expense.update({
      where: { id, settled: false },
      data: {
        settled: true,
        settledAt: new Date(),
        syncVersion: { increment: 1 },
      },
      include: {
        splits: { include: { user: { select: { id: true, name: true, color: true } } } },
        paidBy: { select: { id: true, name: true, color: true } },
      },
    });

    if (existing.paidById !== userId) {
      this.notifications.create({
        userId: existing.paidById,
        householdId,
        title: 'Expense settled',
        body: `"${existing.title}" has been settled`,
        type: 'ACTIVITY',
        resourceId: id,
        resourceType: 'expense',
      }).catch((err) => this.logger.warn('notify payer on settle failed', err));
    }

    this.audit.log({ userId, action: 'settle', resource: 'expense', resourceId: id }).catch((err) => this.logger.warn('audit log expense settle failed', err));
    this.realtime.emitToHousehold(householdId, 'expense:settled', expense);

    return expense;
  }

  async getBalances(householdId: string) {
    const members = await this.prisma.householdMember.findMany({
      where: { householdId, leftAt: null },
      include: { user: { select: { id: true, name: true, color: true } } },
    });

    const expenses = await this.prisma.expense.findMany({
      where: { householdId, deletedAt: null, settled: false },
      include: { splits: true },
    });

    // Calculate net balances using integer cents to avoid floating-point precision loss
    const balancesCents: Record<string, number> = {};
    for (const member of members) {
      balancesCents[member.userId] = 0;
    }

    for (const expense of expenses) {
      // Convert Decimal to integer cents
      const paidCents = Math.round(Number(expense.amount) * 100);
      balancesCents[expense.paidById] = (balancesCents[expense.paidById] || 0) + paidCents;

      for (const split of expense.splits) {
        const splitCents = Math.round(Number(split.amount) * 100);
        balancesCents[split.userId] = (balancesCents[split.userId] || 0) - splitCents;
      }
    }

    return members.map((member) => ({
      user: member.user,
      balance: (balancesCents[member.userId] || 0) / 100,
    }));
  }

  async getCategorySummary(householdId: string) {
    const grouped = await this.prisma.expense.groupBy({
      by: ['category'],
      where: { householdId, deletedAt: null },
      _sum: { amount: true },
      _count: { id: true },
    });

    return grouped.map((row) => ({
      category: row.category,
      total: Math.round(Number(row._sum.amount || 0) * 100) / 100,
      count: row._count.id,
    }));
  }
}
