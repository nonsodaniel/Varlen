import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Send a message to the AI assistant' })
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  chat(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChatMessageDto,
  ) {
    return this.aiService.chat(userId, dto);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get AI-powered proactive suggestions' })
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  getSuggestions(@CurrentUser('sub') userId: string) {
    return this.aiService.getSuggestions(userId);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List AI conversations' })
  getConversations(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryConversationsDto,
  ) {
    return this.aiService.getConversations(userId, query);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a conversation with messages' })
  getConversation(
    @CurrentUser('sub') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.aiService.getConversation(userId, conversationId);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete a conversation' })
  deleteConversation(
    @CurrentUser('sub') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.aiService.deleteConversation(userId, conversationId);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get AI usage stats for the current user' })
  getUsage(@CurrentUser('sub') userId: string) {
    return this.aiService.getUsage(userId);
  }
}
