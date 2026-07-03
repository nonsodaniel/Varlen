import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { HouseholdMemberGuard } from '../../common/guards/household-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Goals')
@ApiBearerAuth()
@Controller('households/:householdId/goals')
@UseGuards(HouseholdMemberGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a goal' })
  create(
    @Param('householdId') householdId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateGoalDto,
  ) {
    return this.goalsService.create(householdId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all goals' })
  findAll(@Param('householdId') householdId: string) {
    return this.goalsService.findAll(householdId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a goal by ID' })
  findById(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.goalsService.findById(householdId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a goal (including progress)' })
  update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.update(householdId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a goal' })
  delete(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.goalsService.delete(householdId, id);
  }
}
