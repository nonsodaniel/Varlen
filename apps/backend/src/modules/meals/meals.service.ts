import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { CreateMealPlanDto } from './dto/create-meal-plan.dto';

@Injectable()
export class MealsService {
  private readonly logger = new Logger(MealsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async createMeal(householdId: string, dto: CreateMealDto, userId: string) {
    const meal = await this.prisma.meal.create({
      data: {
        householdId,
        title: dto.title,
        type: dto.type,
        ingredients: dto.ingredients ?? [],
        prepTime: dto.prepTime,
        servings: dto.servings,
        emoji: dto.emoji ?? '',
        tags: dto.tags ?? [],
        notes: dto.notes,
        createdById: userId,
      },
    });

    this.notifyHouseholdMembers(
      householdId,
      userId,
      'New Meal Added',
      `added a meal: "${dto.title}"`,
      'meal',
      meal.id,
    ).catch((err) => this.logger.warn('notify members on meal create failed', err));

    return meal;
  }

  async findAllMeals(householdId: string) {
    return this.prisma.meal.findMany({
      where: { householdId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMealById(householdId: string, id: string) {
    const meal = await this.prisma.meal.findFirst({
      where: { id, householdId, deletedAt: null },
    });

    if (!meal) {
      throw new NotFoundException(`Meal with ID "${id}" not found`);
    }

    return meal;
  }

  async updateMeal(householdId: string, id: string, dto: UpdateMealDto) {
    await this.findMealById(householdId, id);

    return this.prisma.meal.update({
      where: { id, deletedAt: null },
      data: {
        ...dto,
        ...(dto.ingredients !== undefined && { ingredients: dto.ingredients }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
      },
    });
  }

  async deleteMeal(householdId: string, id: string) {
    await this.findMealById(householdId, id);

    return this.prisma.meal.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  // ── Meal Plans ──

  async setMealPlan(householdId: string, dto: CreateMealPlanDto) {
    return this.prisma.mealPlan.upsert({
      where: {
        householdId_date_mealType: {
          householdId,
          date: new Date(dto.date),
          mealType: dto.mealType,
        },
      },
      update: {
        mealId: dto.mealId ?? null,
        customTitle: dto.customTitle ?? null,
      },
      create: {
        householdId,
        date: new Date(dto.date),
        mealType: dto.mealType,
        mealId: dto.mealId,
        customTitle: dto.customTitle,
      },
    });
  }

  async getMealPlans(householdId: string, startDate?: string, endDate?: string) {
    const where: any = { householdId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    return this.prisma.mealPlan.findMany({
      where,
      include: { meal: true },
      orderBy: { date: 'asc' },
    });
  }

  async deleteMealPlan(householdId: string, id: string) {
    const plan = await this.prisma.mealPlan.findFirst({
      where: { id, householdId },
    });

    if (!plan) {
      throw new NotFoundException(`Meal plan with ID "${id}" not found`);
    }

    return this.prisma.mealPlan.delete({ where: { id } });
  }

  private async notifyHouseholdMembers(
    householdId: string,
    actorId: string,
    title: string,
    action: string,
    resourceType: string,
    resourceId: string,
  ) {
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
