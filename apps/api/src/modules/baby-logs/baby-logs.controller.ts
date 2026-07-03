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
import { BabyLogsService } from './baby-logs.service';
import { CreateBabyLogDto } from './dto/create-baby-log.dto';
import { UpdateBabyLogDto } from './dto/update-baby-log.dto';
import { QueryBabyLogsDto } from './dto/query-baby-logs.dto';
import { HouseholdMemberGuard } from '../../common/guards/household-member.guard';

@ApiTags('Baby Logs')
@ApiBearerAuth()
@Controller('households/:householdId/children/:childId/logs')
@UseGuards(HouseholdMemberGuard)
export class BabyLogsController {
  constructor(private readonly babyLogsService: BabyLogsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a baby log entry' })
  create(
    @Param('householdId') householdId: string,
    @Param('childId') childId: string,
    @Body() dto: CreateBabyLogDto,
  ) {
    return this.babyLogsService.create(householdId, childId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List baby logs with optional filters' })
  findAll(
    @Param('householdId') householdId: string,
    @Param('childId') childId: string,
    @Query() query: QueryBabyLogsDto,
  ) {
    return this.babyLogsService.findAll(householdId, childId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a baby log entry by ID' })
  findById(
    @Param('householdId') householdId: string,
    @Param('childId') childId: string,
    @Param('id') id: string,
  ) {
    return this.babyLogsService.findById(householdId, childId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a baby log entry' })
  update(
    @Param('householdId') householdId: string,
    @Param('childId') childId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBabyLogDto,
  ) {
    return this.babyLogsService.update(householdId, childId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a baby log entry' })
  delete(
    @Param('householdId') householdId: string,
    @Param('childId') childId: string,
    @Param('id') id: string,
  ) {
    return this.babyLogsService.delete(householdId, childId, id);
  }
}
