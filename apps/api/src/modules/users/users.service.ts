import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a user by ID, excluding passwordHash and soft-deleted records.
   */
  async findById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        color: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Find a user by email, including passwordHash for auth verification.
   */
  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  /**
   * Create a new user with pre-hashed password data.
   */
  async create(data: { email: string; passwordHash: string; name: string }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        color: true,
        createdAt: true,
      },
    });
  }

  /**
   * Update user profile fields (name, avatarUrl, color).
   */
  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        color: true,
        createdAt: true,
      },
    });
  }

  /**
   * Soft delete a user account. Also soft-deletes all household memberships.
   */
  async delete(id: string) {
    await this.findById(id);

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.householdMember.updateMany({
        where: { userId: id, leftAt: null },
        data: { leftAt: now },
      }),
      this.prisma.user.update({
        where: { id },
        data: { deletedAt: now },
      }),
    ]);

    return { message: 'Account deleted successfully' };
  }

  /**
   * GDPR data export - returns all user data as JSON.
   */
  async exportData(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        color: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          include: {
            household: {
              select: {
                id: true,
                name: true,
                mode: true,
              },
            },
          },
        },
        createdEvents: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            description: true,
            startDate: true,
            endDate: true,
            allDay: true,
            color: true,
            location: true,
            createdAt: true,
          },
        },
        createdTasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            description: true,
            completed: true,
            dueDate: true,
            priority: true,
            category: true,
            createdAt: true,
          },
        },
        assignedTasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            description: true,
            completed: true,
            dueDate: true,
            priority: true,
            category: true,
            createdAt: true,
          },
        },
        createdLists: {
          where: { deletedAt: null },
          include: {
            items: {
              where: { deletedAt: null },
              select: {
                id: true,
                name: true,
                quantity: true,
                unit: true,
                checked: true,
                category: true,
              },
            },
          },
        },
        paidExpenses: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            amount: true,
            currency: true,
            category: true,
            date: true,
            settled: true,
            createdAt: true,
          },
        },
        notifications: {
          select: {
            id: true,
            title: true,
            body: true,
            type: true,
            read: true,
            createdAt: true,
          },
        },
        auditLogs: {
          select: {
            id: true,
            action: true,
            resource: true,
            resourceId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      exportedAt: new Date().toISOString(),
      user,
    };
  }
}
