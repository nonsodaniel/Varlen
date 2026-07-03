import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChildDto {
  @ApiProperty({ description: 'Child name', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Date of birth in ISO 8601 format' })
  @IsDateString()
  dateOfBirth: string;

  @ApiPropertyOptional({ description: 'Avatar image URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ description: 'Profile color hex code' })
  @IsString()
  color: string;

  @ApiPropertyOptional({ description: 'School name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  schoolName?: string;

  @ApiPropertyOptional({ description: 'List of allergies', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiPropertyOptional({ description: 'Bedtime (e.g. "20:00")' })
  @IsOptional()
  @IsString()
  bedtime?: string;

  @ApiPropertyOptional({ description: 'Additional notes', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
