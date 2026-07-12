import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateReactionDto } from './dto/create-reaction.dto';

@Injectable()
export class ReactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async create(householdId: string, userId: string, dto: CreateReactionDto) {
    const reaction = await this.prisma.reaction.upsert({
      where: {
        userId_entityType_entityId_emoji: {
          userId,
          entityType: dto.entityType,
          entityId: dto.entityId,
          emoji: dto.emoji,
        },
      },
      create: {
        userId,
        householdId,
        emoji: dto.emoji,
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
      update: {},
    });

    this.realtime.emitToHousehold(householdId, 'reaction:new', reaction);

    return reaction;
  }

  async findByEntity(
    householdId: string,
    entityType: string,
    entityId: string,
  ) {
    return this.prisma.reaction.findMany({
      where: { householdId, entityType, entityId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async remove(householdId: string, userId: string, id: string) {
    const reaction = await this.prisma.reaction.findFirst({
      where: { id, householdId, userId },
    });

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    await this.prisma.reaction.delete({ where: { id } });

    this.realtime.emitToHousehold(householdId, 'reaction:removed', {
      id,
      entityType: reaction.entityType,
      entityId: reaction.entityId,
    });

    return { deleted: true };
  }
}
