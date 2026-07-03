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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { HouseholdMemberGuard } from '../../common/guards/household-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('households/:householdId/tasks')
@UseGuards(HouseholdMemberGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  create(
    @Param('householdId') householdId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(householdId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tasks with optional filters' })
  findAll(
    @Param('householdId') householdId: string,
    @Query() query: QueryTasksDto,
  ) {
    return this.tasksService.findAll(householdId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single task' })
  findById(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.tasksService.findById(householdId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(householdId, id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a task' })
  delete(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.tasksService.delete(householdId, id, userId);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle task completion status' })
  toggle(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.tasksService.toggle(householdId, id, userId);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign task to a user' })
  assign(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: AssignTaskDto,
  ) {
    return this.tasksService.assign(householdId, id, dto.assignedToId, userId);
  }
}
