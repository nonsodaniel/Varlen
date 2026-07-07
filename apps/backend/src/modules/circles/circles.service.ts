import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCircleDto } from './dto/create-circle.dto';
import { UpdateCircleDto } from './dto/update-circle.dto';

@Injectable()
export class CirclesService {
  constructor(private prisma: PrismaService) {}

  private readonly memberSelect = {
    id: true,
    role: true,
    joinedAt: true,
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        color: true,
      },
    },
  };

  async getUserCircles(userId: string) {
    const memberships = await this.prisma.householdMember.findMany({
      where: { userId, leftAt: null },
      include: {
        household: {
          include: {
            members: {
              where: { leftAt: null },
              select: this.memberSelect,
            },
            _count: {
              select: {
                members: { where: { leftAt: null } },
              },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      id: m.household.id,
      name: m.household.name,
      type: m.household.type,
      mode: m.household.mode,
      emoji: m.household.emoji,
      color: m.household.color,
      description: m.household.description,
      role: m.role,
      memberCount: m.household._count.members,
      members: m.household.members.map((mem) => ({
        id: mem.user.id,
        name: mem.user.name,
        avatarUrl: mem.user.avatarUrl,
        color: mem.user.color,
        role: mem.role,
      })),
      createdAt: m.household.createdAt,
    }));
  }

  async create(userId: string, dto: CreateCircleDto) {
    if (dto.type === 'PRIMARY') {
      throw new BadRequestException(
        'Cannot manually create a PRIMARY circle. One is created automatically on registration.',
      );
    }

    const circle = await this.prisma.$transaction(async (tx) => {
      const household = await tx.household.create({
        data: {
          name: dto.name,
          type: (dto.type as any) || 'CUSTOM',
          mode: (dto.mode as any) || 'COUPLE',
          emoji: dto.emoji,
          color: dto.color,
          description: dto.description,
          createdById: userId,
        },
      });

      await tx.householdMember.create({
        data: {
          userId,
          householdId: household.id,
          role: 'OWNER',
        },
      });

      return household;
    });

    return {
      id: circle.id,
      name: circle.name,
      type: circle.type,
      mode: circle.mode,
      emoji: circle.emoji,
      color: circle.color,
      description: circle.description,
      memberCount: 1,
      createdAt: circle.createdAt,
    };
  }

  async findById(circleId: string, userId: string) {
    const membership = await this.prisma.householdMember.findUnique({
      where: {
        userId_householdId: { userId, householdId: circleId },
      },
    });

    if (!membership || membership.leftAt) {
      throw new NotFoundException('Circle not found');
    }

    const circle = await this.prisma.household.findFirst({
      where: { id: circleId, deletedAt: null },
      include: {
        members: {
          where: { leftAt: null },
          select: this.memberSelect,
        },
        _count: {
          select: {
            members: { where: { leftAt: null } },
          },
        },
      },
    });

    if (!circle) {
      throw new NotFoundException('Circle not found');
    }

    return {
      id: circle.id,
      name: circle.name,
      type: circle.type,
      mode: circle.mode,
      emoji: circle.emoji,
      color: circle.color,
      description: circle.description,
      role: membership.role,
      memberCount: circle._count.members,
      members: circle.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        color: m.user.color,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      createdAt: circle.createdAt,
    };
  }

  async update(circleId: string, userId: string, dto: UpdateCircleDto) {
    await this.verifyOwnerOrAdmin(circleId, userId);

    const circle = await this.prisma.household.update({
      where: { id: circleId },
      data: {
        name: dto.name,
        type: dto.type as any,
        emoji: dto.emoji,
        color: dto.color,
        description: dto.description,
      },
    });

    return {
      id: circle.id,
      name: circle.name,
      type: circle.type,
      mode: circle.mode,
      emoji: circle.emoji,
      color: circle.color,
      description: circle.description,
    };
  }

  async delete(circleId: string, userId: string) {
    await this.verifyOwnerOrAdmin(circleId, userId);

    const circle = await this.prisma.household.findUnique({
      where: { id: circleId },
    });

    if (!circle) {
      throw new NotFoundException('Circle not found');
    }

    if (circle.type === 'PRIMARY') {
      throw new BadRequestException('Cannot delete your primary circle');
    }

    await this.prisma.household.update({
      where: { id: circleId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  private async verifyOwnerOrAdmin(circleId: string, userId: string) {
    const membership = await this.prisma.householdMember.findUnique({
      where: {
        userId_householdId: { userId, householdId: circleId },
      },
    });

    if (!membership || membership.leftAt) {
      throw new NotFoundException('Circle not found');
    }

    if (!['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new ForbiddenException('Only owners and admins can modify this circle');
    }
  }
}
