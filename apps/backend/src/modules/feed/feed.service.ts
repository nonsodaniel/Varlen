import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { VisibilityService } from '../../common/services/visibility.service';

export interface FeedQuery {
  type?: string;
  circleId?: string;
  limit?: number;
  cursor?: string;
}

export interface FeedItem {
  id: string;
  entityType: string;
  title: string;
  description?: string;
  circleId: string;
  circleName: string;
  circleEmoji?: string;
  circleColor?: string;
  createdById: string;
  createdByName?: string;
  date: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class FeedService {
  constructor(
    private prisma: PrismaService,
    private visibility: VisibilityService,
  ) {}

  async getFeed(userId: string, query: FeedQuery) {
    const limit = Math.min(query.limit || 20, 50);
    const circleIds = query.circleId
      ? [query.circleId]
      : await this.visibility.getUserCircleIds(userId);

    if (circleIds.length === 0) return { items: [], nextCursor: null };

    const items: FeedItem[] = [];

    // Fetch items based on type filter or all types
    const types = query.type ? [query.type] : ['task', 'event', 'list', 'expense', 'memory', 'poll', 'goal', 'countdown'];

    const fetchers: Record<string, () => Promise<FeedItem[]>> = {
      task: () => this.fetchTasks(circleIds, userId, limit),
      event: () => this.fetchEvents(circleIds, userId, limit),
      list: () => this.fetchLists(circleIds, userId, limit),
      expense: () => this.fetchExpenses(circleIds, userId, limit),
      memory: () => this.fetchMemories(circleIds, userId, limit),
      poll: () => this.fetchPolls(circleIds, userId, limit),
      goal: () => this.fetchGoals(circleIds, userId, limit),
      countdown: () => this.fetchCountdowns(circleIds, userId, limit),
    };

    const results = await Promise.all(
      types.filter((t) => fetchers[t]).map((t) => fetchers[t]()),
    );

    for (const result of results) {
      items.push(...result);
    }

    // Sort by date descending and limit
    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    const limited = items.slice(0, limit);

    const nextCursor =
      limited.length === limit
        ? limited[limited.length - 1].id
        : null;

    return { items: limited, nextCursor };
  }

  private async fetchTasks(circleIds: string[], userId: string, limit: number): Promise<FeedItem[]> {
    const tasks = await this.prisma.task.findMany({
      where: {
        householdId: { in: circleIds },
        deletedAt: null,
        OR: [
          { visibility: 'CIRCLE_ONLY' },
          { visibility: 'PRIVATE', createdById: userId },
        ],
      },
      include: {
        household: { select: { id: true, name: true, emoji: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return tasks.map((t) => ({
      id: t.id,
      entityType: 'task',
      title: t.title,
      description: t.description || undefined,
      circleId: t.household.id,
      circleName: t.household.name,
      circleEmoji: t.household.emoji || undefined,
      circleColor: t.household.color || undefined,
      createdById: t.createdById,
      date: t.createdAt,
      metadata: {
        completed: t.completed,
        priority: t.priority,
        dueDate: t.dueDate,
        assignedToId: t.assignedToId,
      },
    }));
  }

  private async fetchEvents(circleIds: string[], userId: string, limit: number): Promise<FeedItem[]> {
    const events = await this.prisma.calendarEvent.findMany({
      where: {
        householdId: { in: circleIds },
        deletedAt: null,
        OR: [
          { visibility: 'CIRCLE_ONLY' },
          { visibility: 'PRIVATE', createdById: userId },
        ],
      },
      include: {
        household: { select: { id: true, name: true, emoji: true, color: true } },
      },
      orderBy: { startDate: 'desc' },
      take: limit,
    });

    return events.map((e) => ({
      id: e.id,
      entityType: 'event',
      title: e.title,
      description: e.description || undefined,
      circleId: e.household.id,
      circleName: e.household.name,
      circleEmoji: e.household.emoji || undefined,
      circleColor: e.household.color || undefined,
      createdById: e.createdById,
      date: e.startDate,
      metadata: {
        startDate: e.startDate,
        endDate: e.endDate,
        allDay: e.allDay,
        location: e.location,
        color: e.color,
      },
    }));
  }

  private async fetchLists(circleIds: string[], userId: string, limit: number): Promise<FeedItem[]> {
    const lists = await this.prisma.shoppingList.findMany({
      where: {
        householdId: { in: circleIds },
        deletedAt: null,
        OR: [
          { visibility: 'CIRCLE_ONLY' },
          { visibility: 'PRIVATE', createdById: userId },
        ],
      },
      include: {
        household: { select: { id: true, name: true, emoji: true, color: true } },
        _count: { select: { items: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return lists.map((l) => ({
      id: l.id,
      entityType: 'list',
      title: l.name,
      circleId: l.household.id,
      circleName: l.household.name,
      circleEmoji: l.household.emoji || undefined,
      circleColor: l.household.color || undefined,
      createdById: l.createdById,
      date: l.updatedAt,
      metadata: { itemCount: l._count.items },
    }));
  }

  private async fetchExpenses(circleIds: string[], userId: string, limit: number): Promise<FeedItem[]> {
    const expenses = await this.prisma.expense.findMany({
      where: {
        householdId: { in: circleIds },
        deletedAt: null,
        OR: [
          { visibility: 'CIRCLE_ONLY' },
          { visibility: 'PRIVATE', paidById: userId },
        ],
      },
      include: {
        household: { select: { id: true, name: true, emoji: true, color: true } },
      },
      orderBy: { date: 'desc' },
      take: limit,
    });

    return expenses.map((e) => ({
      id: e.id,
      entityType: 'expense',
      title: e.title,
      circleId: e.household.id,
      circleName: e.household.name,
      circleEmoji: e.household.emoji || undefined,
      circleColor: e.household.color || undefined,
      createdById: e.paidById,
      date: e.date,
      metadata: {
        amount: e.amount,
        currency: e.currency,
        category: e.category,
        settled: e.settled,
      },
    }));
  }

  private async fetchMemories(circleIds: string[], userId: string, limit: number): Promise<FeedItem[]> {
    const memories = await this.prisma.memory.findMany({
      where: {
        householdId: { in: circleIds },
        deletedAt: null,
        OR: [
          { visibility: 'CIRCLE_ONLY' },
          { visibility: 'PRIVATE', createdById: userId },
        ],
      },
      include: {
        household: { select: { id: true, name: true, emoji: true, color: true } },
      },
      orderBy: { date: 'desc' },
      take: limit,
    });

    return memories.map((m) => ({
      id: m.id,
      entityType: 'memory',
      title: m.title,
      description: m.description || undefined,
      circleId: m.household.id,
      circleName: m.household.name,
      circleEmoji: m.household.emoji || undefined,
      circleColor: m.household.color || undefined,
      createdById: m.createdById,
      date: m.date,
      metadata: { type: m.type, emoji: m.emoji },
    }));
  }

  private async fetchPolls(circleIds: string[], userId: string, limit: number): Promise<FeedItem[]> {
    const polls = await this.prisma.poll.findMany({
      where: {
        householdId: { in: circleIds },
        deletedAt: null,
        OR: [
          { visibility: 'CIRCLE_ONLY' },
          { visibility: 'PRIVATE', createdById: userId },
        ],
      },
      include: {
        household: { select: { id: true, name: true, emoji: true, color: true } },
        _count: { select: { options: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return polls.map((p) => ({
      id: p.id,
      entityType: 'poll',
      title: p.question,
      circleId: p.household.id,
      circleName: p.household.name,
      circleEmoji: p.household.emoji || undefined,
      circleColor: p.household.color || undefined,
      createdById: p.createdById,
      date: p.createdAt,
      metadata: { status: p.status, optionCount: p._count.options },
    }));
  }

  private async fetchGoals(circleIds: string[], userId: string, limit: number): Promise<FeedItem[]> {
    const goals = await this.prisma.goal.findMany({
      where: {
        householdId: { in: circleIds },
        deletedAt: null,
        OR: [
          { visibility: 'CIRCLE_ONLY' },
          { visibility: 'PRIVATE', createdById: userId },
        ],
      },
      include: {
        household: { select: { id: true, name: true, emoji: true, color: true } },
      },
      orderBy: { deadline: 'asc' },
      take: limit,
    });

    return goals.map((g) => ({
      id: g.id,
      entityType: 'goal',
      title: g.title,
      circleId: g.household.id,
      circleName: g.household.name,
      circleEmoji: g.household.emoji || undefined,
      circleColor: g.household.color || undefined,
      createdById: g.createdById,
      date: g.createdAt,
      metadata: {
        progress: g.progress,
        target: g.target,
        unit: g.unit,
        deadline: g.deadline,
        color: g.color,
      },
    }));
  }

  private async fetchCountdowns(circleIds: string[], userId: string, limit: number): Promise<FeedItem[]> {
    const countdowns = await this.prisma.countdown.findMany({
      where: {
        householdId: { in: circleIds },
        deletedAt: null,
        visibility: 'CIRCLE_ONLY',
      },
      include: {
        household: { select: { id: true, name: true, emoji: true, color: true } },
      },
      orderBy: { date: 'asc' },
      take: limit,
    });

    return countdowns.map((c) => ({
      id: c.id,
      entityType: 'countdown',
      title: c.title,
      circleId: c.household.id,
      circleName: c.household.name,
      circleEmoji: c.household.emoji || undefined,
      circleColor: c.household.color || undefined,
      createdById: '',
      date: c.date,
      metadata: { emoji: c.emoji, color: c.color },
    }));
  }
}
