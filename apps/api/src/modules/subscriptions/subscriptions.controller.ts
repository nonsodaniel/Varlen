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
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { HouseholdMemberGuard } from '../../common/guards/household-member.guard';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('households/:householdId/subscriptions')
@UseGuards(HouseholdMemberGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a subscription' })
  create(
    @Param('householdId') householdId: string,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.create(householdId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all subscriptions' })
  findAll(@Param('householdId') householdId: string) {
    return this.subscriptionsService.findAll(householdId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subscription by ID' })
  findById(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.subscriptionsService.findById(householdId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subscription' })
  update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionsService.update(householdId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a subscription' })
  delete(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.subscriptionsService.delete(householdId, id);
  }
}
