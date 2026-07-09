import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGoalDto {
  @ApiProperty({ description: 'Goal title', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Target value', minimum: 1 })
  @IsNumber()
  @Min(1)
  target: number;

  @ApiPropertyOptional({ description: 'Unit of measurement (e.g. "books", "miles", "dollars")', default: 'units' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Deadline in ISO 8601 format' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ description: 'Color hex code for the goal', default: '#3B82F6' })
  @IsOptional()
  @IsString()
  color?: string;
}
