import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MemoriesService } from './memories.service';
import { CreateMemoryDto } from './dto/create-memory.dto';
import { UpdateMemoryDto } from './dto/update-memory.dto';
import { QueryMemoriesDto } from './dto/query-memories.dto';
import { HouseholdMemberGuard } from '../../common/guards/household-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Memories')
@ApiBearerAuth()
@Controller('households/:householdId/memories')
@UseGuards(HouseholdMemberGuard)
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a memory' })
  create(
    @Param('householdId') householdId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateMemoryDto,
  ) {
    return this.memoriesService.create(householdId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List memories with optional filters' })
  findAll(
    @Param('householdId') householdId: string,
    @Query() query: QueryMemoriesDto,
  ) {
    return this.memoriesService.findAll(householdId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a memory by ID' })
  findById(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.memoriesService.findById(householdId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a memory' })
  update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMemoryDto,
  ) {
    return this.memoriesService.update(householdId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a memory' })
  delete(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.memoriesService.delete(householdId, id);
  }
}
