import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeService,
  ) {}

  async getMessages(householdId: string, limit = 60) {
    const messages = await this.prisma.message.findMany({
      where: { householdId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Return oldest first
    return messages.reverse().map((m) => this.formatMessage(m));
  }

  async createMessage(householdId: string, senderId: string, dto: CreateMessageDto) {
    const metadata: Record<string, any> = {};
    if (dto.poll) metadata.poll = dto.poll;
    if (dto.activityCard) metadata.activityCard = dto.activityCard;
    if (dto.dateIdea) metadata.dateIdea = dto.dateIdea;
    if (dto.location) metadata.location = dto.location;

    const message = await this.prisma.message.create({
      data: {
        householdId,
        senderId,
        type: dto.type,
        content: dto.content,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        readBy: [senderId],
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    const formatted = this.formatMessage(message);

    // Broadcast to all household members in real-time
    this.realtime.emitToHousehold(householdId, 'chat:message', formatted);

    return formatted;
  }

  async markRead(householdId: string, userId: string) {
    // Add userId to readBy for all unread messages in the household
    const unread = await this.prisma.message.findMany({
      where: {
        householdId,
        NOT: { readBy: { has: userId } },
      },
      select: { id: true },
    });

    if (unread.length === 0) return { updated: 0 };

    await Promise.all(
      unread.map((m) =>
        this.prisma.message.update({
          where: { id: m.id },
          data: { readBy: { push: userId } },
        }),
      ),
    );

    return { updated: unread.length };
  }

  async vote(householdId: string, messageId: string, userId: string, optionIndex: number) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.householdId !== householdId) {
      throw new NotFoundException('Message not found');
    }

    const meta = (message.metadata as Record<string, any>) ?? {};
    const poll = meta.poll ?? {};
    if (!poll.options) throw new ForbiddenException('Not a poll message');
    if (poll.closed) throw new ForbiddenException('Poll is closed');

    poll.votes = { ...(poll.votes ?? {}), [userId]: optionIndex };
    meta.poll = poll;

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { metadata: meta },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    });

    const formatted = this.formatMessage(updated);
    this.realtime.emitToHousehold(householdId, 'chat:vote', { householdId, messageId, message: formatted });
    return formatted;
  }

  async likeIdea(householdId: string, messageId: string, userId: string, ideaIndex: number) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.householdId !== householdId) {
      throw new NotFoundException('Message not found');
    }

    const meta = (message.metadata as Record<string, any>) ?? {};
    const dateIdea = meta.dateIdea ?? {};
    if (!dateIdea.ideas) throw new ForbiddenException('Not a date idea message');

    const likes: Record<string, number> = { ...(dateIdea.likes ?? {}), [userId]: ideaIndex };

    // Detect match: all voters picked the same idea
    const vals = Object.values(likes);
    const matched = vals.length >= 2 && vals.every((v) => v === vals[0]) ? (vals[0] as number) : undefined;

    dateIdea.likes = likes;
    if (matched !== undefined) dateIdea.matched = matched;
    meta.dateIdea = dateIdea;

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { metadata: meta },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    });

    const formatted = this.formatMessage(updated);
    this.realtime.emitToHousehold(householdId, 'chat:message', formatted);
    return formatted;
  }

  private formatMessage(m: any) {
    const meta = (m.metadata ?? {}) as Record<string, any>;
    return {
      id: m.id,
      householdId: m.householdId,
      senderId: m.senderId,
      senderName: m.sender?.name ?? 'Unknown',
      senderAvatar: m.sender?.avatarUrl ?? null,
      type: m.type,
      content: m.content,
      poll: meta.poll ?? undefined,
      activityCard: meta.activityCard ?? undefined,
      dateIdea: meta.dateIdea ?? undefined,
      location: meta.location ?? undefined,
      readBy: m.readBy ?? [],
      createdAt: m.createdAt.toISOString(),
    };
  }
}
