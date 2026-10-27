import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { HouseholdMemberGuard } from '../../common/guards/household-member.guard';

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('households/:householdId/messages')
@UseGuards(HouseholdMemberGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get household chat messages' })
  async getMessages(
    @Param('householdId') householdId: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagesService.getMessages(householdId, limit ? parseInt(limit, 10) : 60);
  }

  @Post()
  @ApiOperation({ summary: 'Send a chat message' })
  async createMessage(
    @Param('householdId') householdId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.createMessage(householdId, userId, dto);
  }

  @Post('read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all messages as read' })
  async markRead(
    @Param('householdId') householdId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.messagesService.markRead(householdId, userId);
  }

  @Post(':messageId/vote')
  @ApiOperation({ summary: 'Vote on a poll message' })
  async vote(
    @Param('householdId') householdId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
    @Body('optionIndex') optionIndex: number,
  ) {
    return this.messagesService.vote(householdId, messageId, userId, optionIndex);
  }

  @Post(':messageId/like')
  @ApiOperation({ summary: 'Like a date idea option' })
  async likeIdea(
    @Param('householdId') householdId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
    @Body('ideaIndex') ideaIndex: number,
  ) {
    return this.messagesService.likeIdea(householdId, messageId, userId, ideaIndex);
  }

  @Delete(':messageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a chat message (sender only)' })
  async deleteMessage(
    @Param('householdId') householdId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.messagesService.deleteMessage(householdId, messageId, userId);
  }
}
