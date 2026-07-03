import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecurringType } from '@prisma/client';

export class CreateEventDto {
  @ApiProperty({ description: 'Event title', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Event description', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'Start date in ISO 8601 format' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date in ISO 8601 format' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Whether the event is all day', default: false })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean = false;

  @ApiPropertyOptional({ description: 'Event color hex code', default: '#6366F1' })
  @IsOptional()
  @IsString()
  color?: string = '#6366F1';

  @ApiPropertyOptional({ description: 'Event location', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional({ description: 'Whether the event is shared with the household', default: true })
  @IsOptional()
  @IsBoolean()
  shared?: boolean = true;

  @ApiPropertyOptional({ description: 'Recurring type', enum: RecurringType })
  @IsOptional()
  @IsEnum(RecurringType)
  recurring?: RecurringType;
}
