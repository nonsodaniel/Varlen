import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@Injectable()
export class ChildrenService {
  constructor(private readonly prisma: PrismaService) {}

  async create(householdId: string, dto: CreateChildDto) {
    return this.prisma.child.create({
      data: {
        householdId,
        name: dto.name,
        dateOfBirth: new Date(dto.dateOfBirth),
        avatarUrl: dto.avatarUrl,
        color: dto.color,
        schoolName: dto.schoolName,
        allergies: dto.allergies ?? [],
        bedtime: dto.bedtime,
        notes: dto.notes,
      },
    });
  }

  async findAll(householdId: string) {
    return this.prisma.child.findMany({
      where: {
        householdId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(householdId: string, id: string) {
    const child = await this.prisma.child.findFirst({
      where: {
        id,
        householdId,
        deletedAt: null,
      },
    });

    if (!child) {
      throw new NotFoundException(`Child with ID "${id}" not found`);
    }

    return child;
  }

  async update(householdId: string, id: string, dto: UpdateChildDto) {
    await this.findById(householdId, id);

    const { dateOfBirth, ...rest } = dto;

    return this.prisma.child.update({
      where: { id },
      data: {
        ...rest,
        ...(dateOfBirth !== undefined && { dateOfBirth: new Date(dateOfBirth) }),
      },
    });
  }

  async delete(householdId: string, id: string) {
    await this.findById(householdId, id);

    return this.prisma.child.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
