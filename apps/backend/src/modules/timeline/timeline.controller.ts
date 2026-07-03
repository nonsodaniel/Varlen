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
import { TimelineService } from './timeline.service';
import { CreateTimelineEntryDto } from './dto/create-timeline-entry.dto';
import { UpdateTimelineEntryDto } from './dto/update-timeline-entry.dto';
import { QueryTimelineDto } from './dto/query-timeline.dto';
import { HouseholdMemberGuard } from '../../common/guards/household-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Timeline')
@ApiBearerAuth()
@Controller('households/:householdId/timeline')
@UseGuards(HouseholdMemberGuard)
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Post()
  @ApiOperation({ summary: 'Create a timeline entry' })
  create(
    @Param('householdId') householdId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateTimelineEntryDto,
  ) {
    return this.timelineService.create(householdId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List timeline entries with optional filters' })
  findAll(
    @Param('householdId') householdId: string,
    @Query() query: QueryTimelineDto,
  ) {
    return this.timelineService.findAll(householdId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a timeline entry by ID' })
  findById(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.timelineService.findById(householdId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a timeline entry' })
  update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTimelineEntryDto,
  ) {
    return this.timelineService.update(householdId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a timeline entry' })
  delete(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.timelineService.delete(householdId, id);
  }
}
