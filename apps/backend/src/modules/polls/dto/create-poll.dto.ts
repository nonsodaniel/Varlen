import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePollOptionDto {
  @ApiProperty({ description: 'Option label' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label: string;

  @ApiPropertyOptional({ description: 'Emoji for the option' })
  @IsOptional()
  @IsString()
  emoji?: string;
}

export class CreatePollDto {
  @ApiProperty({ description: 'Poll question', minLength: 1, maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  question: string;

  @ApiPropertyOptional({ description: 'When the poll closes, ISO 8601 format' })
  @IsOptional()
  @IsDateString()
  closesAt?: string;

  @ApiProperty({ description: 'Poll options (min 2)', type: [CreatePollOptionDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreatePollOptionDto)
  options: CreatePollOptionDto[];
}
