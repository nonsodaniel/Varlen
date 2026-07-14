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
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { HouseholdMemberGuard } from '../../common/guards/household-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Calendar')
@ApiBearerAuth()
@Controller('households/:householdId/events')
@UseGuards(HouseholdMemberGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post()
  @ApiOperation({ summary: 'Create a calendar event' })
  create(
    @Param('householdId') householdId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.calendarService.create(householdId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List calendar events with optional filters' })
  findAll(
    @Param('householdId') householdId: string,
    @Query() query: QueryEventsDto,
  ) {
    return this.calendarService.findAll(householdId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single calendar event' })
  findById(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.calendarService.findById(householdId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a calendar event' })
  update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.calendarService.update(householdId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a calendar event' })
  delete(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.calendarService.delete(householdId, id, userId);
  }

  @Get('export/ics')
  @ApiOperation({ summary: 'Export calendar events as ICS file' })
  async exportIcs(
    @Param('householdId') householdId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.calendarService.exportIcs(householdId, startDate, endDate);
  }
}
