import {
  IsString,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTimelineEntryDto {
  @ApiProperty({ description: 'Entry title', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Entry description', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Emoji icon' })
  @IsOptional()
  @IsString()
  emoji?: string;

  @ApiProperty({ description: 'Entry date in ISO 8601 format' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: 'Category (e.g. "relationship", "family", "home", "travel")', default: 'general' })
  @IsOptional()
  @IsString()
  category?: string;
}
