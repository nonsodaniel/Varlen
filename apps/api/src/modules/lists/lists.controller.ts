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
import { ListsService } from './lists.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { HouseholdMemberGuard } from '../../common/guards/household-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Shopping Lists')
@ApiBearerAuth()
@Controller('households/:householdId/lists')
@UseGuards(HouseholdMemberGuard)
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  // ── Lists ──

  @Post()
  @ApiOperation({ summary: 'Create a shopping list' })
  createList(
    @Param('householdId') householdId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateListDto,
  ) {
    return this.listsService.createList(householdId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all shopping lists' })
  findAllLists(@Param('householdId') householdId: string) {
    return this.listsService.findAllLists(householdId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shopping list with items' })
  findListById(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.listsService.findListById(householdId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a shopping list' })
  updateList(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() dto: UpdateListDto,
  ) {
    return this.listsService.updateList(householdId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a shopping list and its items' })
  deleteList(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.listsService.deleteList(householdId, id);
  }

  // ── Items ──

  @Post(':listId/items')
  @ApiOperation({ summary: 'Add an item to a shopping list' })
  addItem(
    @Param('householdId') householdId: string,
    @Param('listId') listId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateItemDto,
  ) {
    return this.listsService.addItem(householdId, listId, userId, dto);
  }

  @Patch(':listId/items/:itemId')
  @ApiOperation({ summary: 'Update a shopping list item' })
  updateItem(
    @Param('householdId') householdId: string,
    @Param('listId') listId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.listsService.updateItem(householdId, listId, itemId, dto);
  }

  @Patch(':listId/items/:itemId/toggle')
  @ApiOperation({ summary: 'Toggle item checked status' })
  toggleItem(
    @Param('householdId') householdId: string,
    @Param('listId') listId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.listsService.toggleItem(householdId, listId, itemId);
  }

  @Delete(':listId/items/:itemId')
  @ApiOperation({ summary: 'Soft delete a shopping list item' })
  deleteItem(
    @Param('householdId') householdId: string,
    @Param('listId') listId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.listsService.deleteItem(householdId, listId, itemId);
  }
}
