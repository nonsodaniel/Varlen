import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoutineDto {
  @ApiProperty({ description: 'Routine title', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Time of day (e.g. "08:00", "21:30")' })
  @IsString()
  time: string;

  @ApiPropertyOptional({ description: 'Days of week (0=Sun, 1=Mon, ..., 6=Sat)', type: [Number], default: [] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  days?: number[] = [];

  @ApiProperty({ description: 'User ID assigned to this routine' })
  @IsString()
  assignedToId: string;

  @ApiProperty({ description: 'Routine category (e.g. "morning", "evening", "chore")' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ description: 'Whether the routine is enabled', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;
}
