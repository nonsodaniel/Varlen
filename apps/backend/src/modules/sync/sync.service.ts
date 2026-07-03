import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SyncPushDto, SyncChange } from './dto/sync-push.dto';

export interface SyncConflict {
  model: string;
  id: string;
  clientVersion: number;
  serverVersion: number;
  serverData: any;
}

const SYNCABLE_MODELS = [
  'CalendarEvent',
  'Task',
  'ShoppingList',
  'ShoppingItem',
  'Expense',
] as const;

type SyncableModel = (typeof SYNCABLE_MODELS)[number];

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private prisma: PrismaService) {}

  private getPrismaModel(model: string) {
    const modelMap: Record<string, any> = {
      CalendarEvent: this.prisma.calendarEvent,
      Task: this.prisma.task,
      ShoppingList: this.prisma.shoppingList,
      ShoppingItem: this.prisma.shoppingItem,
      Expense: this.prisma.expense,
    };
    return modelMap[model] || null;
  }

  async push(
    userId: string,
    householdId: string,
    payload: SyncPushDto,
  ): Promise<{ processed: number; conflicts: SyncConflict[] }> {
    const conflicts: SyncConflict[] = [];
    let processed = 0;

    for (const change of payload.changes) {
      try {
        const prismaModel = this.getPrismaModel(change.model);
        if (!prismaModel) {
          this.logger.warn(`Unknown sync model: ${change.model}`);
          continue;
        }

        if (change.operation === 'create') {
          await prismaModel.create({
            data: {
              ...change.data,
              id: change.id,
              householdId,
              clientId: change.clientId,
              syncVersion: 1,
            },
          });
          processed++;
        } else if (change.operation === 'update') {
          const existing = await prismaModel.findUnique({
            where: { id: change.id },
          });

          if (
            existing &&
            change.syncVersion !== undefined &&
            existing.syncVersion > change.syncVersion
          ) {
            conflicts.push({
              model: change.model,
              id: change.id,
              clientVersion: change.syncVersion,
              serverVersion: existing.syncVersion,
              serverData: existing,
            });
            continue;
          }

          await prismaModel.update({
            where: { id: change.id },
            data: {
              ...change.data,
              syncVersion: { increment: 1 },
            },
          });
          processed++;
        } else if (change.operation === 'delete') {
          await prismaModel.update({
            where: { id: change.id },
            data: {
              deletedAt: new Date(),
              syncVersion: { increment: 1 },
            },
          });
          processed++;
        }
      } catch (error) {
        this.logger.error(
          `Sync push error for ${change.model}:${change.id}`,
          error,
        );
      }
    }

    return { processed, conflicts };
  }

  async pull(
    userId: string,
    householdId: string,
    since: string,
    version: number,
  ) {
    const sinceDate = new Date(since);
    const changes: SyncChange[] = [];
    let maxVersion = version;

    for (const modelName of SYNCABLE_MODELS) {
      const prismaModel = this.getPrismaModel(modelName);
      if (!prismaModel) continue;

      const whereClause: any = {
        OR: [
          { syncVersion: { gt: version } },
          { updatedAt: { gt: sinceDate } },
        ],
      };

      // ShoppingItem doesn't have householdId directly
      if (modelName !== 'ShoppingItem') {
        whereClause.householdId = householdId;
      }

      const records = await prismaModel.findMany({
        where: whereClause,
      });

      for (const record of records) {
        const isDeleted = record.deletedAt !== null && record.deletedAt !== undefined;

        changes.push({
          operation: isDeleted ? 'delete' : 'update',
          model: modelName,
          id: record.id,
          data: isDeleted ? undefined : record,
          syncVersion: record.syncVersion,
        });

        if (record.syncVersion > maxVersion) {
          maxVersion = record.syncVersion;
        }
      }
    }

    return {
      changes,
      serverVersion: maxVersion,
    };
  }

  async updateCheckpoint(userId: string, deviceId: string, version: number) {
    return this.prisma.syncCheckpoint.upsert({
      where: {
        userId_deviceId: { userId, deviceId },
      },
      create: {
        userId,
        deviceId,
        lastSyncAt: new Date(),
        lastVersion: version,
      },
      update: {
        lastSyncAt: new Date(),
        lastVersion: version,
      },
    });
  }
}
