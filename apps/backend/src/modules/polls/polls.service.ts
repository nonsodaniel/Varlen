import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreatePollDto } from './dto/create-poll.dto';

@Injectable()
export class PollsService {
  private readonly logger = new Logger(PollsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  async create(householdId: string, userId: string, dto: CreatePollDto) {
    const poll = await this.prisma.poll.create({
      data: {
        householdId,
        createdById: userId,
        question: dto.question,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : undefined,
        options: {
          create: dto.options.map((opt) => ({
            label: opt.label,
            emoji: opt.emoji,
          })),
        },
      },
      include: { options: true },
    });

    this.prisma.householdMember.findMany({
      where: { householdId, leftAt: null },
      select: { userId: true },
    }).then((members) => {
      const others = members.filter((m) => m.userId !== userId);
      Promise.allSettled(
        others.map((m) =>
          this.notifications.create({
            userId: m.userId,
            householdId,
            title: 'New poll',
            body: `Vote on: "${dto.question}"`,
            type: 'ACTIVITY',
            resourceId: poll.id,
            resourceType: 'poll',
          }),
        ),
      );
    }).catch((err) => this.logger.warn('notify members on poll create failed', err));

    this.audit.log({ userId, action: 'create', resource: 'poll', resourceId: poll.id }).catch((err) => this.logger.warn('audit log poll create failed', err));
    this.realtime.emitToHousehold(householdId, 'poll:created', poll);

    return poll;
  }

  async findAll(householdId: string) {
    return this.prisma.poll.findMany({
      where: {
        householdId,
        deletedAt: null,
      },
      include: { options: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findById(householdId: string, id: string) {
    const poll = await this.prisma.poll.findFirst({
      where: {
        id,
        householdId,
        deletedAt: null,
      },
      include: { options: true },
    });

    if (!poll) {
      throw new NotFoundException(`Poll with ID "${id}" not found`);
    }

    return poll;
  }

  async vote(householdId: string, id: string, userId: string, optionId: string) {
    const poll = await this.findById(householdId, id);

    if (poll.status !== 'active') {
      throw new BadRequestException('This poll is no longer active');
    }

    if (poll.closesAt && new Date() > poll.closesAt) {
      throw new BadRequestException('This poll has closed');
    }

    const option = poll.options.find((o) => o.id === optionId);
    if (!option) {
      throw new NotFoundException(`Option with ID "${optionId}" not found in this poll`);
    }

    // Use transaction to prevent race condition between removing and adding votes
    const updatedOption = await this.prisma.$transaction(async (tx) => {
      // Re-fetch options inside transaction for consistent read
      const freshOptions = await tx.pollOption.findMany({
        where: { pollId: id },
      });

      // Remove user's vote from all options
      for (const opt of freshOptions) {
        if (opt.votes.includes(userId)) {
          await tx.pollOption.update({
            where: { id: opt.id },
            data: {
              votes: opt.votes.filter((v) => v !== userId),
            },
          });
        }
      }

      // Add vote to selected option
      const freshOption = freshOptions.find((o) => o.id === optionId);
      const currentVotes = freshOption
        ? freshOption.votes.filter((v) => v !== userId)
        : [];

      return tx.pollOption.update({
        where: { id: optionId },
        data: {
          votes: [...currentVotes, userId],
        },
      });
    });

    this.realtime.emitToHousehold(householdId, 'poll:voted', { pollId: id, optionId, userId });

    return updatedOption;
  }

  async close(householdId: string, id: string) {
    await this.findById(householdId, id);

    return this.prisma.poll.update({
      where: { id, deletedAt: null },
      data: { status: 'closed' },
      include: { options: true },
    });
  }

  async delete(householdId: string, id: string) {
    await this.findById(householdId, id);

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.pollOption.deleteMany({
        where: { pollId: id },
      }),
      this.prisma.poll.update({
        where: { id, deletedAt: null },
        data: { deletedAt: now },
      }),
    ]);

    return { message: 'Poll deleted successfully' };
  }
}
