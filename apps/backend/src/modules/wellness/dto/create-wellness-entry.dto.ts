import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsObject,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWellnessEntryDto {
  @ApiProperty({ description: 'Entry date in ISO 8601 format' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Mood score (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  mood: number;

  @ApiProperty({ description: 'Hours of sleep', minimum: 0, maximum: 24 })
  @IsNumber()
  @Min(0)
  @Max(24)
  sleep: number;

  @ApiProperty({ description: 'Glasses of water', minimum: 0 })
  @IsNumber()
  @Min(0)
  water: number;

  @ApiPropertyOptional({ description: 'Whether exercise was done', default: false })
  @IsOptional()
  @IsBoolean()
  exercise?: boolean = false;

  @ApiPropertyOptional({ description: 'Additional notes', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({ description: 'Custom wellness metrics as key-value pairs', type: 'object' })
  @IsOptional()
  @IsObject()
  customMetrics?: Record<string, string>;
}
