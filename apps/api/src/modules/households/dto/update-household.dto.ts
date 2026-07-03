import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateHouseholdDto {
  @ApiPropertyOptional({ description: 'Household name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Anniversary date (ISO 8601)' })
  @IsOptional()
  @IsDateString({}, { message: 'anniversary must be a valid ISO 8601 date' })
  anniversary?: string;

  @ApiPropertyOptional({ description: 'Together since date (ISO 8601)' })
  @IsOptional()
  @IsDateString({}, { message: 'togetherSince must be a valid ISO 8601 date' })
  togetherSince?: string;
}
