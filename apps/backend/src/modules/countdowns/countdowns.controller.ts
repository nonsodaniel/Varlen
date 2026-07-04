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
import { CountdownsService } from './countdowns.service';
import { CreateCountdownDto } from './dto/create-countdown.dto';
import { UpdateCountdownDto } from './dto/update-countdown.dto';
import { HouseholdMemberGuard } from '../../common/guards/household-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Countdowns')
@ApiBearerAuth()
@Controller('households/:householdId/countdowns')
@UseGuards(HouseholdMemberGuard)
export class CountdownsController {
  constructor(private readonly countdownsService: CountdownsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a countdown' })
  create(
    @Param('householdId') householdId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateCountdownDto,
  ) {
    return this.countdownsService.create(householdId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all countdowns' })
  findAll(@Param('householdId') householdId: string) {
    return this.countdownsService.findAll(householdId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a countdown by ID' })
  findById(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.countdownsService.findById(householdId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a countdown' })
  update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCountdownDto,
  ) {
    return this.countdownsService.update(householdId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a countdown' })
  delete(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.countdownsService.delete(householdId, id);
  }
}
