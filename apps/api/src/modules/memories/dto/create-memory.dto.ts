import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMemoryDto {
  @ApiProperty({ description: 'Memory title', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Memory description', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'Date of the memory in ISO 8601 format' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: 'Memory type (e.g. "milestone", "anniversary", "first")', default: 'milestone' })
  @IsOptional()
  @IsString()
  type?: string = 'milestone';

  @ApiPropertyOptional({ description: 'Whether the memory is shared', default: true })
  @IsOptional()
  @IsBoolean()
  shared?: boolean = true;

  @ApiPropertyOptional({ description: 'Emoji icon for the memory' })
  @IsOptional()
  @IsString()
  emoji?: string;
}
