import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({ description: 'Message to send to the AI assistant', maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({ description: 'Conversation ID to continue an existing chat' })
  @IsOptional()
  @IsString()
  conversationId?: string;
}
