import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(householdId: string, dto: CreateSubscriptionDto) {
    return this.prisma.subscription.create({
      data: {
        householdId,
        name: dto.name,
        amount: dto.amount,
        currency: dto.currency ?? 'USD',
        cycle: dto.cycle ?? 'monthly',
        category: dto.category ?? 'OTHER',
        nextBillingDate: new Date(dto.nextBillingDate),
        shared: dto.shared ?? true,
      },
    });
  }

  async findAll(householdId: string) {
    return this.prisma.subscription.findMany({
      where: {
        householdId,
        deletedAt: null,
      },
      orderBy: { nextBillingDate: 'asc' },
    });
  }

  async findById(householdId: string, id: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id,
        householdId,
        deletedAt: null,
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID "${id}" not found`);
    }

    return subscription;
  }

  async update(householdId: string, id: string, dto: UpdateSubscriptionDto) {
    await this.findById(householdId, id);

    const { nextBillingDate, ...rest } = dto;

    return this.prisma.subscription.update({
      where: { id },
      data: {
        ...rest,
        ...(nextBillingDate !== undefined && { nextBillingDate: new Date(nextBillingDate) }),
      },
    });
  }

  async delete(householdId: string, id: string) {
    await this.findById(householdId, id);

    return this.prisma.subscription.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
