import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ListsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Lists ──

  async createList(householdId: string, userId: string, dto: CreateListDto) {
    return this.prisma.shoppingList.create({
      data: {
        householdId,
        createdById: userId,
        name: dto.name,
        shared: dto.shared ?? true,
        syncVersion: 0,
      },
      include: { items: true },
    });
  }

  async findAllLists(householdId: string) {
    return this.prisma.shoppingList.findMany({
      where: { householdId, deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { items: { where: { deletedAt: null } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findListById(householdId: string, id: string) {
    const list = await this.prisma.shoppingList.findFirst({
      where: { id, householdId, deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!list) {
      throw new NotFoundException(`Shopping list with ID "${id}" not found`);
    }

    return list;
  }

  async updateList(householdId: string, id: string, dto: UpdateListDto) {
    await this.findListById(householdId, id);

    return this.prisma.shoppingList.update({
      where: { id },
      data: {
        ...dto,
        syncVersion: { increment: 1 },
      },
      include: { items: { where: { deletedAt: null } } },
    });
  }

  async deleteList(householdId: string, id: string) {
    await this.findListById(householdId, id);

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.shoppingItem.updateMany({
        where: { listId: id, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.shoppingList.update({
        where: { id },
        data: { deletedAt: now, syncVersion: { increment: 1 } },
      }),
    ]);

    return { message: 'List deleted successfully' };
  }

  // ── Items ──

  async addItem(householdId: string, listId: string, userId: string, dto: CreateItemDto) {
    await this.findListById(householdId, listId);

    return this.prisma.shoppingItem.create({
      data: {
        listId,
        addedById: userId,
        name: dto.name,
        quantity: dto.quantity ?? 1,
        unit: dto.unit,
        category: dto.category,
        syncVersion: 0,
      },
    });
  }

  async updateItem(householdId: string, listId: string, itemId: string, dto: UpdateItemDto) {
    await this.findListById(householdId, listId);
    await this.findItemById(listId, itemId);

    return this.prisma.shoppingItem.update({
      where: { id: itemId },
      data: {
        ...dto,
        syncVersion: { increment: 1 },
      },
    });
  }

  async toggleItem(householdId: string, listId: string, itemId: string) {
    await this.findListById(householdId, listId);
    const item = await this.findItemById(listId, itemId);

    return this.prisma.shoppingItem.update({
      where: { id: itemId },
      data: {
        checked: !item.checked,
        syncVersion: { increment: 1 },
      },
    });
  }

  async deleteItem(householdId: string, listId: string, itemId: string) {
    await this.findListById(householdId, listId);
    await this.findItemById(listId, itemId);

    return this.prisma.shoppingItem.update({
      where: { id: itemId },
      data: {
        deletedAt: new Date(),
        syncVersion: { increment: 1 },
      },
    });
  }

  private async findItemById(listId: string, itemId: string) {
    const item = await this.prisma.shoppingItem.findFirst({
      where: { id: itemId, listId, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID "${itemId}" not found`);
    }

    return item;
  }
}
