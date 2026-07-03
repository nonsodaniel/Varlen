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
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { HouseholdMemberGuard } from '../../common/guards/household-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Expenses')
@ApiBearerAuth()
@Controller('households/:householdId/expenses')
@UseGuards(HouseholdMemberGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an expense' })
  create(
    @Param('householdId') householdId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expensesService.create(householdId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List expenses with optional filters' })
  findAll(
    @Param('householdId') householdId: string,
    @Query() query: QueryExpensesDto,
  ) {
    return this.expensesService.findAll(householdId, query);
  }

  @Get('balances')
  @ApiOperation({ summary: 'Get expense balances between household members' })
  getBalances(@Param('householdId') householdId: string) {
    return this.expensesService.getBalances(householdId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get expense category summary' })
  getCategorySummary(@Param('householdId') householdId: string) {
    return this.expensesService.getCategorySummary(householdId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single expense' })
  findById(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.expensesService.findById(householdId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an expense' })
  update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(householdId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete an expense' })
  delete(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.expensesService.delete(householdId, id, userId);
  }

  @Patch(':id/settle')
  @ApiOperation({ summary: 'Mark an expense as settled' })
  settle(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.expensesService.settle(householdId, id, userId);
  }
}
