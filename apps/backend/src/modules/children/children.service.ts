import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@Injectable()
export class ChildrenService {
  private readonly logger = new Logger(ChildrenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(householdId: string, dto: CreateChildDto, userId?: string) {
    const child = await this.prisma.child.create({
      data: {
        householdId,
        name: dto.name,
        dateOfBirth: new Date(dto.dateOfBirth),
        avatarUrl: dto.avatarUrl,
        color: dto.color,
        schoolName: dto.schoolName,
        allergies: dto.allergies ?? [],
        bedtime: dto.bedtime,
        notes: dto.notes,
      },
    });

    if (userId) {
      this.notifyHouseholdMembers(householdId, userId, 'Child Added', `added ${dto.name} to the family`, 'child', child.id).catch((err) => this.logger.warn('notify members on child create failed', err));
    }

    return child;
  }

  async findAll(householdId: string) {
    return this.prisma.child.findMany({
      where: {
        householdId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(householdId: string, id: string) {
    const child = await this.prisma.child.findFirst({
      where: {
        id,
        householdId,
        deletedAt: null,
      },
    });

    if (!child) {
      throw new NotFoundException(`Child with ID "${id}" not found`);
    }

    return child;
  }

  async update(householdId: string, id: string, dto: UpdateChildDto) {
    await this.findById(householdId, id);

    const { dateOfBirth, ...rest } = dto;

    return this.prisma.child.update({
      where: { id },
      data: {
        ...rest,
        ...(dateOfBirth !== undefined && { dateOfBirth: new Date(dateOfBirth) }),
      },
    });
  }

  async delete(householdId: string, id: string) {
    await this.findById(householdId, id);

    return this.prisma.child.update({
      where: { id },
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
