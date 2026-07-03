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
import { PollsService } from './polls.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { VotePollDto } from './dto/vote-poll.dto';
import { HouseholdMemberGuard } from '../../common/guards/household-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Polls')
@ApiBearerAuth()
@Controller('households/:householdId/polls')
@UseGuards(HouseholdMemberGuard)
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a poll' })
  create(
    @Param('householdId') householdId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreatePollDto,
  ) {
    return this.pollsService.create(householdId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all polls' })
  findAll(@Param('householdId') householdId: string) {
    return this.pollsService.findAll(householdId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a poll by ID' })
  findById(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.pollsService.findById(householdId, id);
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'Vote on a poll option' })
  vote(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: VotePollDto,
  ) {
    return this.pollsService.vote(householdId, id, userId, dto.optionId);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Close a poll' })
  close(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.pollsService.close(householdId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a poll' })
  delete(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.pollsService.delete(householdId, id);
  }
}
