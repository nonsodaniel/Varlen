import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReactionsService } from './reactions.service';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { HouseholdMemberGuard } from '../../common/guards/household-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reactions')
@ApiBearerAuth()
@Controller('households/:householdId/reactions')
@UseGuards(HouseholdMemberGuard)
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a reaction' })
  create(
    @Param('householdId') householdId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateReactionDto,
  ) {
    return this.reactionsService.create(householdId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get reactions for an entity' })
  findByEntity(
    @Param('householdId') householdId: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.reactionsService.findByEntity(householdId, entityType, entityId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a reaction' })
  remove(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.reactionsService.remove(householdId, userId, id);
  }
}
