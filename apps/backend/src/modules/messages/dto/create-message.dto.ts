import { IsString, IsIn, IsOptional, IsObject } from 'class-validator';

export class CreateMessageDto {
  @IsIn(['text', 'poll', 'activity_card', 'date_idea', 'nudge', 'image', 'location'])
  type: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  poll?: Record<string, any>;

  @IsOptional()
  @IsObject()
  activityCard?: Record<string, any>;

  @IsOptional()
  @IsObject()
  dateIdea?: Record<string, any>;

  @IsOptional()
  @IsObject()
  location?: Record<string, any>;
}
