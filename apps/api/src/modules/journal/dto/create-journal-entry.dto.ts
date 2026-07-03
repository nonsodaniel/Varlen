import {
  IsString,
  IsNumber,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateJournalEntryDto {
  @ApiProperty({ description: 'Entry date in ISO 8601 format' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Mood score (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  mood: number;

  @ApiProperty({ description: 'What you are grateful for', maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  gratitude: string;

  @ApiProperty({ description: 'Journal note', maxLength: 5000 })
  @IsString()
  @MaxLength(5000)
  note: string;
}
