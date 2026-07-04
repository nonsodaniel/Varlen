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
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { HouseholdMemberGuard } from '../../common/guards/household-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Budgets')
@ApiBearerAuth()
@Controller('households/:householdId/budgets')
@UseGuards(HouseholdMemberGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a budget for an expense category' })
  create(
    @Param('householdId') householdId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateBudgetDto,
  ) {
    return this.budgetsService.create(householdId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all budgets for the household' })
  findAll(@Param('householdId') householdId: string) {
    return this.budgetsService.findAll(householdId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a budget by ID' })
  findById(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.budgetsService.findById(householdId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a budget' })
  update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(householdId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a budget' })
  delete(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.budgetsService.delete(householdId, id);
  }
}
