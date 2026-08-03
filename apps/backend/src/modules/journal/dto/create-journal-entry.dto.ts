import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJournalEntryDto {
  @ApiProperty({ description: 'Entry date in ISO 8601 format' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: 'Mood score (1-5)', minimum: 1, maximum: 5, default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  mood?: number;

  @ApiPropertyOptional({ description: 'Optional entry title', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  gratitude?: string;

  @ApiProperty({ description: 'Journal content', maxLength: 10000 })
  @IsString()
  @MaxLength(10000)
  note: string;
}
