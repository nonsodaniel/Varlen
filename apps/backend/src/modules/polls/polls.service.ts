import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePollDto } from './dto/create-poll.dto';

@Injectable()
export class PollsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(householdId: string, userId: string, dto: CreatePollDto) {
    return this.prisma.poll.create({
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
  }

  async findAll(householdId: string) {
    return this.prisma.poll.findMany({
      where: {
        householdId,
        deletedAt: null,
      },
      include: { options: true },
      orderBy: { createdAt: 'desc' },
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

    // Remove user's vote from all options in this poll, then add to selected
    for (const opt of poll.options) {
      if (opt.votes.includes(userId)) {
        await this.prisma.pollOption.update({
          where: { id: opt.id },
          data: {
            votes: opt.votes.filter((v) => v !== userId),
          },
        });
      }
    }

    const updatedOption = await this.prisma.pollOption.update({
      where: { id: optionId },
      data: {
        votes: { push: userId },
      },
    });

    return updatedOption;
  }

  async close(householdId: string, id: string) {
    await this.findById(householdId, id);

    return this.prisma.poll.update({
      where: { id },
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
        where: { id },
        data: { deletedAt: now },
      }),
    ]);

    return { message: 'Poll deleted successfully' };
  }
}
