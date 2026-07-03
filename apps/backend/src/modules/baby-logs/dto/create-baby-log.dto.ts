import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBabyLogDto {
  @ApiProperty({ description: 'Log type (e.g. "feeding", "diaper", "sleep", "milestone")' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Timestamp in ISO 8601 format' })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ description: 'Additional notes', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
