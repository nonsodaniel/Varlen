import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(householdId: string, query: string, types?: string[]) {
    const q = `%${query.toLowerCase()}%`;
    const searchAll = !types || types.length === 0;
    const results: Record<string, any[]> = {};

    const searches = [];

    if (searchAll || types?.includes('tasks')) {
      searches.push(
        this.prisma.task.findMany({
          where: {
            householdId,
            deletedAt: null,
            title: { contains: query, mode: 'insensitive' },
          },
          take: 10,
          orderBy: { updatedAt: 'desc' },
          select: { id: true, title: true, completed: true, dueDate: true, priority: true },
        }).then(r => { results.tasks = r; }),
      );
    }

    if (searchAll || types?.includes('events')) {
      searches.push(
        this.prisma.calendarEvent.findMany({
          where: {
            householdId,
            deletedAt: null,
            title: { contains: query, mode: 'insensitive' },
          },
          take: 10,
          orderBy: { startDate: 'desc' },
          select: { id: true, title: true, startDate: true, endDate: true, color: true },
        }).then(r => { results.events = r; }),
      );
    }

    if (searchAll || types?.includes('expenses')) {
      searches.push(
        this.prisma.expense.findMany({
          where: {
            householdId,
            deletedAt: null,
            title: { contains: query, mode: 'insensitive' },
          },
          take: 10,
          orderBy: { date: 'desc' },
          select: { id: true, title: true, amount: true, category: true, date: true },
        }).then(r => { results.expenses = r; }),
      );
    }

    if (searchAll || types?.includes('lists')) {
      searches.push(
        this.prisma.shoppingList.findMany({
          where: {
            householdId,
            deletedAt: null,
            name: { contains: query, mode: 'insensitive' },
          },
          take: 10,
          orderBy: { updatedAt: 'desc' },
          select: { id: true, name: true, createdAt: true },
        }).then(r => { results.lists = r; }),
      );
    }

    if (searchAll || types?.includes('meals')) {
      searches.push(
        this.prisma.meal.findMany({
          where: {
            householdId,
            deletedAt: null,
            title: { contains: query, mode: 'insensitive' },
          },
          take: 10,
          orderBy: { updatedAt: 'desc' },
          select: { id: true, title: true, type: true, emoji: true },
        }).then(r => { results.meals = r; }),
      );
    }

    if (searchAll || types?.includes('memories')) {
      searches.push(
        this.prisma.memory.findMany({
          where: {
            householdId,
            deletedAt: null,
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: 10,
          orderBy: { date: 'desc' },
          select: { id: true, title: true, date: true, emoji: true },
        }).then(r => { results.memories = r; }),
      );
    }

    if (searchAll || types?.includes('goals')) {
      searches.push(
        this.prisma.goal.findMany({
          where: {
            householdId,
            deletedAt: null,
            title: { contains: query, mode: 'insensitive' },
          },
          take: 10,
          orderBy: { updatedAt: 'desc' },
          select: { id: true, title: true, progress: true, target: true },
        }).then(r => { results.goals = r; }),
      );
    }

    await Promise.allSettled(searches);
    return results;
  }
}
