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
import { MealsService } from './meals.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { CreateMealPlanDto } from './dto/create-meal-plan.dto';
import { HouseholdMemberGuard } from '../../common/guards/household-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Meals')
@ApiBearerAuth()
@Controller('households/:householdId/meals')
@UseGuards(HouseholdMemberGuard)
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  // ── Meals ──

  @Post()
  @ApiOperation({ summary: 'Create a meal' })
  createMeal(
    @Param('householdId') householdId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateMealDto,
  ) {
    return this.mealsService.createMeal(householdId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all meals' })
  findAllMeals(@Param('householdId') householdId: string) {
    return this.mealsService.findAllMeals(householdId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a meal by ID' })
  findMealById(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.mealsService.findMealById(householdId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a meal' })
  updateMeal(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMealDto,
  ) {
    return this.mealsService.updateMeal(householdId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a meal' })
  deleteMeal(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.mealsService.deleteMeal(householdId, id);
  }

  // ── Meal Plans ──

  @Post('plans')
  @ApiOperation({ summary: 'Set a meal plan for a date/slot' })
  setMealPlan(
    @Param('householdId') householdId: string,
    @Body() dto: CreateMealPlanDto,
  ) {
    return this.mealsService.setMealPlan(householdId, dto);
  }

  @Get('plans/week')
  @ApiOperation({ summary: 'Get meal plans for a date range' })
  getMealPlans(
    @Param('householdId') householdId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.mealsService.getMealPlans(householdId, startDate, endDate);
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'Delete a meal plan entry' })
  deleteMealPlan(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.mealsService.deleteMealPlan(householdId, id);
  }
}
