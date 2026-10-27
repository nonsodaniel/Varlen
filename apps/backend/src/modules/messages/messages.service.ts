import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
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
    if (dto.replyTo) metadata.replyTo = dto.replyTo;

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
    // Single UPDATE: append userId to readBy for all messages where not already read.
    // Uses array_append instead of N individual update() calls.
    const updated = await this.prisma.$executeRaw`
      UPDATE "messages"
      SET "readBy" = array_append("readBy", ${userId}::text)
      WHERE "householdId" = ${householdId}
        AND NOT (${userId} = ANY("readBy"))
    `;

    if (updated > 0) {
      // Notify all household members so senders can update their read receipts in real-time
      this.realtime.emitToHousehold(householdId, 'chat:read', { householdId, userId });
    }

    return { updated };
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

  async deleteMessage(householdId: string, messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.householdId !== householdId) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new BadRequestException('You can only delete your own messages');
    }

    await this.prisma.message.delete({ where: { id: messageId } });

    // Notify household members that the message was removed
    this.realtime.emitToHousehold(householdId, 'chat:message:deleted', { householdId, messageId });

    return { deleted: true };
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
      replyTo: meta.replyTo ?? undefined,
      readBy: m.readBy ?? [],
      createdAt: m.createdAt.toISOString(),
    };
  }
}
