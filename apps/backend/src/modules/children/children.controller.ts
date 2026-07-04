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
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { HouseholdMemberGuard } from '../../common/guards/household-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Children')
@ApiBearerAuth()
@Controller('households/:householdId/children')
@UseGuards(HouseholdMemberGuard)
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}

  @Post()
  @ApiOperation({ summary: 'Add a child to the household' })
  create(
    @Param('householdId') householdId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateChildDto,
  ) {
    return this.childrenService.create(householdId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all children in the household' })
  findAll(@Param('householdId') householdId: string) {
    return this.childrenService.findAll(householdId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a child by ID' })
  findById(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.childrenService.findById(householdId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a child profile' })
  update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChildDto,
  ) {
    return this.childrenService.update(householdId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a child from the household' })
  delete(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.childrenService.delete(householdId, id);
  }
}
