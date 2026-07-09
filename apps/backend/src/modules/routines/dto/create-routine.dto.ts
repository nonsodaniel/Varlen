import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoutineDto {
  @ApiProperty({ description: 'Routine title', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Time of day (e.g. "08:00", "21:30")', default: '' })
  @IsOptional()
  @IsString()
  time?: string = '';

  @ApiPropertyOptional({ description: 'Days of week (0=Sun, 1=Mon, ..., 6=Sat)', type: [Number], default: [] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  days?: number[] = [];

  @ApiPropertyOptional({ description: 'User ID assigned to this routine' })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Routine category (e.g. "morning", "evening", "chore")', default: 'general' })
  @IsOptional()
  @IsString()
  category?: string = 'general';

  @ApiPropertyOptional({ description: 'Whether the routine is enabled', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @ApiPropertyOptional({ description: 'Emoji icon for the routine' })
  @IsOptional()
  @IsString()
  emoji?: string;

  @ApiPropertyOptional({ description: 'Frequency: DAILY, WEEKLY, etc.', default: 'DAILY' })
  @IsOptional()
  @IsString()
  frequency?: string = 'DAILY';

  @ApiPropertyOptional({ description: 'Display color' })
  @IsOptional()
  @IsString()
  color?: string;
}
