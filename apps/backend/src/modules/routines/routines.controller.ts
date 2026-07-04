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
import { RoutinesService } from './routines.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { HouseholdMemberGuard } from '../../common/guards/household-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Routines')
@ApiBearerAuth()
@Controller('households/:householdId/routines')
@UseGuards(HouseholdMemberGuard)
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a routine' })
  create(
    @Param('householdId') householdId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateRoutineDto,
  ) {
    return this.routinesService.create(householdId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all routines' })
  findAll(@Param('householdId') householdId: string) {
    return this.routinesService.findAll(householdId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a routine by ID' })
  findById(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.routinesService.findById(householdId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a routine' })
  update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRoutineDto,
  ) {
    return this.routinesService.update(householdId, id, dto);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle routine enabled/disabled' })
  toggle(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.routinesService.toggle(householdId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a routine' })
  delete(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.routinesService.delete(householdId, id);
  }
}
