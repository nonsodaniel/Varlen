import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { PushService } from './push.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private realtimeService: RealtimeService,
    private pushService: PushService,
  ) {}

  async create(data: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        householdId: data.householdId,
        title: data.title,
        body: data.body,
        type: data.type,
        icon: data.icon,
        resourceId: data.resourceId,
        resourceType: data.resourceType,
      },
    });

    // Push notification to user in real-time via WebSocket (fire-and-forget, never crash the request)
    try {
      this.realtimeService.emitToUser(data.userId, 'notification:new', notification);
    } catch (error) {
      this.logger.error(`WebSocket emit failed for user ${data.userId}`, error);
    }

    // Send mobile push notification (fire-and-forget, never crash the request)
    try {
      this.pushService.sendToUser(data.userId, data.title, data.body, {
        type: data.type?.toLowerCase(),
        resourceType: data.resourceType,
        resourceId: data.resourceId,
      }).catch((err) => this.logger.error(`Push send failed for user ${data.userId}`, err));
    } catch (error) {
      this.logger.error(`Push dispatch failed for user ${data.userId}`, error);
    }

    return notification;
  }

  async findAll(userId: string, query: PaginationDto) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Notification does not belong to user');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });

    return { updated: result.count };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });

    return { count };
  }

  async delete(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Notification does not belong to user');
    }

    await this.prisma.notification.delete({ where: { id } });

    return { deleted: true };
  }
}
