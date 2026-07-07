import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsArray,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum MealType {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  SNACK = 'SNACK',
}

export class CreateMealDto {
  @ApiProperty({ description: 'Meal title', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ enum: MealType, description: 'Meal type' })
  @IsEnum(MealType)
  type: MealType;

  @ApiPropertyOptional({ description: 'Ingredients as JSON array' })
  @IsOptional()
  @IsArray()
  ingredients?: any[];

  @ApiPropertyOptional({ description: 'Prep time in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  prepTime?: number;

  @ApiPropertyOptional({ description: 'Number of servings' })
  @IsOptional()
  @IsInt()
  @Min(1)
  servings?: number;

  @ApiPropertyOptional({ description: 'Emoji icon' })
  @IsOptional()
  @IsString()
  emoji?: string;

  @ApiPropertyOptional({ description: 'Tags as JSON array' })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
